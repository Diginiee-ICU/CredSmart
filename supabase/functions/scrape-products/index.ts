const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqKey = Deno.env.get('GROQ_API_KEY');
    // Resolve which Groq model to use — prefer env override, otherwise auto-detect from account
    let groqModel = Deno.env.get('GROQ_MODEL') || '';
    if (!groqModel) {
      try {
        const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${groqKey}` },
          signal: AbortSignal.timeout(8000),
        });
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          const available: string[] = (modelsData.data || []).map((m: any) => m.id as string);
          console.log('Available Groq models:', available.join(', '));
          // Filter to chat-only models — exclude audio/speech/embedding/terms-gated models
          const chatModels = available.filter((m) =>
            !m.includes('whisper') &&
            !m.includes('tts') &&
            !m.includes('embed') &&
            !m.includes('vision') &&
            !m.includes('guard') &&
            !m.includes('canopylabs') // Requires manual TOS acceptance
          );
          console.log('Chat-capable models:', chatModels.join(', '));
          // Priority list — pick the first one available in the account
          const preferred = [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'llama3-8b-8192',
            'llama3-70b-8192',
            'gemma2-9b-it',
            'mixtral-8x7b-32768',
          ];
          
          groqModel = preferred.find((m) => chatModels.includes(m)) 
            || chatModels.find(m => m.includes('llama')) 
            || chatModels.find(m => m.includes('mixtral'))
            || chatModels.find(m => m.includes('gemma'))
            || chatModels[0] 
            || 'llama3-8b-8192';
        }
      } catch (e) {
        console.warn('Could not fetch Groq models list:', e);
      }
      if (!groqModel) groqModel = 'llama3-8b-8192';
    }

    if (!groqKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Groq API key is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    // ── Strategy 1: Jina Reader (free, handles JS/Cloudflare pages) ──
    let markdown = '';
    let imageUrls: string[] = [];
    let debugLog = [];

    try {
      console.log('Strategy 1: Jina Reader...');
      const jinaRes = await fetch(`https://r.jina.ai/${formattedUrl}`, {
        headers: {
          'Accept': 'application/json',
          'X-Return-Format': 'markdown',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (jinaRes.ok) {
        const jinaData = await jinaRes.json();
        markdown = jinaData?.data?.content || jinaData?.content || '';
        debugLog.push(`Jina OK (length: ${markdown.length})`);
      } else {
        debugLog.push(`Jina Failed: ${jinaRes.status}`);
      }
    } catch (e) {
      debugLog.push(`Jina Error: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ── Strategy 2: Browserless (if configured) ──
    if (!markdown || markdown.length < 100) {
      const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY');
      if (browserlessKey) {
        try {
          console.log('Strategy 2: Browserless...');
          const blRes = await fetch(`https://chrome.browserless.io/content?token=${browserlessKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: formattedUrl,
              gotoOptions: { waitUntil: 'networkidle2', timeout: 15000 },
            }),
          });

          if (blRes.ok) {
            const html = await blRes.text();
            debugLog.push(`Browserless OK (length: ${html.length})`);
            
            // Extract images
            const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
            imageUrls = imgMatches.map((t) => (t.match(/src=["']([^"']+)["']/i) || [])[1]).filter(Boolean);
            
            // Strip HTML to plain text
            markdown = html
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ').trim();
          } else {
            debugLog.push(`Browserless Failed: ${blRes.status}`);
          }
        } catch (e) {
          debugLog.push(`Browserless Error: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        debugLog.push('Browserless skipped (no key)');
      }
    }

    // ── Strategy 3: Direct fetch fallback ──
    if (!markdown || markdown.length < 100) {
      try {
        console.log('Strategy 3: Direct fetch fallback...');
        const pageRes = await fetch(formattedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (pageRes.ok) {
          const html = await pageRes.text();
          debugLog.push(`Direct Fetch OK (length: ${html.length})`);

          if (imageUrls.length === 0) {
            const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
            imageUrls = imgMatches.map((t) => (t.match(/src=["']([^"']+)["']/i) || [])[1]).filter(Boolean);
          }

          markdown = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ').trim();
        } else {
          debugLog.push(`Direct Fetch Failed: ${pageRes.status}`);
        }
      } catch (e) {
        debugLog.push(`Direct Fetch Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Process image URLs
    imageUrls = imageUrls.filter((u) => u && !u.startsWith('data:') && !u.includes('1x1')).map((u) => {
      if (u.startsWith('//')) return `https:${u}`;
      if (u.startsWith('/')) { try { return `${new URL(formattedUrl).origin}${u}`; } catch { return u; } }
      return u;
    }).filter((u) => u.startsWith('http')).slice(0, 60);

    if (!markdown || markdown.length < 50) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Could not extract content from ${formattedUrl}. Strategies used: ${debugLog.join(' | ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!markdown || markdown.length < 50) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not extract content from this page. The site may require JavaScript or block automated access. Try a different product listing URL.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageContext = imageUrls.length > 0
      ? `\n\nAvailable image URLs:\n${imageUrls.join('\n')}`
      : '';

    // Truncate to stay within token limits
    const truncatedContent = markdown.substring(0, 14000) + imageContext;

    // ── Step 3: Groq AI product extraction ──
    console.log('Extracting products with Groq model:', groqModel, 'content length:', truncatedContent.length);

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          {
            role: 'system',
            content: `You are a product data extractor for a retail POS system. Extract product listings from website content into a JSON array.

Each product must have:
- name (string, required) — product name
- brand (string) — brand name or empty string
- category (string) — product category or empty string
- barcode (string) — barcode/SKU if visible, else empty string
- mrp (number) — retail/selling price as number, 0 if not found
- costPrice (number) — cost price if shown, else 70% of mrp
- imageUrl (string) — best matching absolute image URL from the list, or empty string

Rules:
- Only real products (not navigation, ads, banners, or UI elements)
- Return ONLY a valid JSON array, no markdown fences, no explanation
- Return [] if no products found
- Maximum 50 products`,
          },
          {
            role: 'user',
            content: `Extract products from this content:\n\n${truncatedContent}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const groqData = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq error:', groqData);
      return new Response(
        JSON.stringify({ success: false, error: groqData?.error?.message || 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiContent = groqData.choices?.[0]?.message?.content || '[]';
    console.log('Groq response length:', aiContent.length);

    let products = [];
    try {
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        products = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Content snippet:', aiContent.substring(0, 300));
      return new Response(
        JSON.stringify({ success: false, error: 'Could not parse extracted products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validProducts = products
      .filter((p: any) => p && typeof p.name === 'string' && p.name.trim())
      .slice(0, 50)
      .map((p: any) => ({
        name: String(p.name).trim().substring(0, 200),
        brand: String(p.brand || '').trim().substring(0, 100),
        category: String(p.category || '').trim().substring(0, 50),
        barcode: String(p.barcode || '').trim().substring(0, 20),
        mrp: Math.max(0, Number(p.mrp) || 0),
        costPrice: Math.max(0, Number(p.costPrice) || 0),
        imageUrl: String(p.imageUrl || '').trim().substring(0, 500),
      }));

    console.log(`Extracted ${validProducts.length} valid products`);

    return new Response(
      JSON.stringify({ success: true, products: validProducts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
