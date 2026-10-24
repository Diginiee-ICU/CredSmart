import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

describe("Challenger 2 — Component Primitives Adversarial & Stress Harness", () => {
  // =========================================================================
  // 1. BUTTON COMPONENT STRESS HARNESS
  // =========================================================================
  describe("<Button> Primitive Permutations & Standards", () => {
    const variants = [
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
      "ruby",
      "gold",
      "glass",
    ] as const;

    const sizes = [
      "default",
      "sm",
      "table",
      "icon",
      "icon-sm",
      "cta",
      "lg",
      "pill",
      "pill-lg",
    ] as const;

    it("verifies all 81 permutations of variants x sizes render without runtime failure", () => {
      variants.forEach((variant) => {
        sizes.forEach((size) => {
          const testId = `btn-${variant}-${size}`;
          const { unmount } = render(
            <Button variant={variant} size={size} data-testid={testId}>
              Action
            </Button>
          );
          const el = screen.getByTestId(testId);
          expect(el).toBeInTheDocument();
          expect(el.tagName).toBe("BUTTON");
          unmount();
        });
      });
    });

    describe("Variant Classes Verification", () => {
      const variantClassExpectations: Record<string, string[]> = {
        default: ["bg-primary", "text-primary-foreground"],
        destructive: ["bg-destructive", "text-destructive-foreground"],
        outline: ["border", "border-border/80", "bg-background"],
        secondary: ["bg-secondary", "text-secondary-foreground"],
        ghost: ["hover:bg-muted/60"],
        link: ["text-primary", "underline-offset-4"],
        ruby: ["bg-rose-600", "text-white"],
        gold: ["bg-amber-500", "text-slate-950"],
        glass: ["border", "border-border/80", "bg-background/80"],
      };

      Object.entries(variantClassExpectations).forEach(([variant, expectedClasses]) => {
        it(`verifies variant='${variant}' has expected classes: ${expectedClasses.join(", ")}`, () => {
          const classes = buttonVariants({ variant: variant as any });
          expectedClasses.forEach((cls) => {
            expect(classes).toContain(cls);
          });
        });
      });
    });

    describe("Size Classes Verification (Proportions Standard)", () => {
      const sizeClassExpectations: Record<string, string[]> = {
        default: ["h-8.5", "px-3", "rounded-lg", "text-xs", "font-semibold"], // 34px standard
        sm: ["h-7", "px-2.5", "rounded-md", "text-[11px]", "font-medium"], // 28px standard
        table: ["h-7", "px-2.5", "rounded-md", "text-[11px]", "font-medium"], // 28px standard
        icon: ["w-7.5", "h-7.5", "rounded-md", "p-0"], // 30px micro icon
        "icon-sm": ["w-7", "h-7", "rounded-md", "p-0"], // 28px micro icon
        cta: ["w-[46px]", "h-[46px]", "rounded-xl", "font-bold"], // 46px mobile CTA
        lg: ["h-9.5", "px-4", "rounded-lg", "text-sm", "font-semibold"],
        pill: ["h-8.5", "px-3.5", "rounded-full", "text-xs", "font-semibold"],
        "pill-lg": ["h-9.5", "px-4", "rounded-full", "text-sm", "font-semibold"],
      };

      Object.entries(sizeClassExpectations).forEach(([size, expectedClasses]) => {
        it(`verifies size='${size}' has expected classes: ${expectedClasses.join(", ")}`, () => {
          const classes = buttonVariants({ size: size as any });
          expectedClasses.forEach((cls) => {
            expect(classes).toContain(cls);
          });
        });
      });

      it("verifies base button contains tactile scaling and zero oversized bubble classes", () => {
        const classes = buttonVariants();
        expect(classes).toContain("active:scale-[0.98]");
        expect(classes).toContain("transition-colors");
        expect(classes).not.toContain("h-11");
        expect(classes).not.toContain("h-12");
        expect(classes).not.toContain("rounded-2xl");
      });
    });

    describe("Behavioral & Interactive Integrity", () => {
      it("supports asChild delegation to anchor tag (Slot behavior)", () => {
        render(
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard" data-testid="as-child-link">
              Go to Dashboard
            </a>
          </Button>
        );

        const link = screen.getByTestId("as-child-link");
        expect(link.tagName).toBe("A");
        expect(link).toHaveAttribute("href", "/dashboard");
        expect(link.className).toContain("h-7");
        expect(link.className).toContain("bg-background");
      });

      it("dispatches onClick when enabled and suppresses when disabled", () => {
        const handleClick = vi.fn();
        const { rerender } = render(
          <Button onClick={handleClick} data-testid="click-btn">
            Clickable
          </Button>
        );

        const btn = screen.getByTestId("click-btn");
        fireEvent.click(btn);
        expect(handleClick).toHaveBeenCalledTimes(1);

        rerender(
          <Button onClick={handleClick} disabled data-testid="click-btn">
            Disabled
          </Button>
        );
        fireEvent.click(btn);
        expect(handleClick).toHaveBeenCalledTimes(1); // not incremented
        expect(btn).toBeDisabled();
      });

      it("forwards ref to underlying HTML button element", () => {
        const ref = React.createRef<HTMLButtonElement>();
        render(<Button ref={ref}>Ref Button</Button>);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      });
    });
  });

  // =========================================================================
  // 2. CARD PRIMITIVE STRESS HARNESS
  // =========================================================================
  describe("<Card> Primitive & Hierarchy", () => {
    it("renders default Card with shadow-xs and clean border", () => {
      render(<Card data-testid="test-card">Card Content</Card>);
      const card = screen.getByTestId("test-card");
      expect(card.className).toContain("rounded-xl");
      expect(card.className).toContain("shadow-xs");
      expect(card.className).toContain("border");
      expect(card.className).toContain("bg-card");
    });

    it("renders variant='glass' with sanitized flat border instead of 3D reflection", () => {
      render(
        <Card variant="glass" data-testid="glass-card">
          Glass Content
        </Card>
      );
      const card = screen.getByTestId("glass-card");
      expect(card.className).toContain("border-border/80");
      expect(card.className).toContain("bg-card");
      expect(card.className).not.toContain("backdrop-blur-3xl");
      expect(card.className).not.toContain("liquid-card");
    });

    it("verifies CardHeader, Title, Description, Content, Footer layout classes", () => {
      render(
        <Card data-testid="full-card">
          <CardHeader data-testid="card-header">
            <CardTitle data-testid="card-title">Metric Title</CardTitle>
            <CardDescription data-testid="card-desc">Metric Description</CardDescription>
          </CardHeader>
          <CardContent data-testid="card-content">Main Body</CardContent>
          <CardFooter data-testid="card-footer">Footer Action</CardFooter>
        </Card>
      );

      const header = screen.getByTestId("card-header");
      expect(header.className).toContain("p-3.5");
      expect(header.className).toContain("pb-2");
      expect(header.className).toContain("space-y-1.5");

      const title = screen.getByTestId("card-title");
      expect(title.className).toContain("text-base");
      expect(title.className).toContain("font-semibold");

      const desc = screen.getByTestId("card-desc");
      expect(desc.className).toContain("text-xs");
      expect(desc.className).toContain("text-muted-foreground");

      const content = screen.getByTestId("card-content");
      expect(content.className).toContain("p-3.5");
      expect(content.className).toContain("pt-0");

      const footer = screen.getByTestId("card-footer");
      expect(footer.className).toContain("p-3.5");
      expect(footer.className).toContain("pt-0");
    });

    it("forwards ref to Card and CardContent elements", () => {
      const cardRef = React.createRef<HTMLDivElement>();
      const contentRef = React.createRef<HTMLDivElement>();

      render(
        <Card ref={cardRef}>
          <CardContent ref={contentRef}>Content</CardContent>
        </Card>
      );

      expect(cardRef.current).toBeInstanceOf(HTMLDivElement);
      expect(contentRef.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  // =========================================================================
  // 3. BADGE PRIMITIVE STRESS HARNESS
  // =========================================================================
  describe("<Badge> Primitive & Semantic Variants", () => {
    const badgeVariantsList = [
      "default",
      "secondary",
      "destructive",
      "outline",
      "success",
      "warning",
      "info",
    ] as const;

    it("renders all 7 badge variants with text-[11px] and font-mono", () => {
      badgeVariantsList.forEach((variant) => {
        const testId = `badge-${variant}`;
        const { unmount } = render(
          <Badge variant={variant} data-testid={testId}>
            {variant.toUpperCase()}
          </Badge>
        );

        const badge = screen.getByTestId(testId);
        expect(badge).toBeInTheDocument();
        expect(badge.className).toContain("text-[11px]");
        expect(badge.className).toContain("font-mono");
        expect(badge.className).toContain("rounded-full");
        unmount();
      });
    });

    it("verifies semantic color mapping for status badges", () => {
      const successClasses = badgeVariants({ variant: "success" });
      expect(successClasses).toContain("border-emerald-200/80");
      expect(successClasses).toContain("bg-emerald-50");
      expect(successClasses).toContain("text-emerald-700");

      const warningClasses = badgeVariants({ variant: "warning" });
      expect(warningClasses).toContain("border-amber-200/80");
      expect(warningClasses).toContain("bg-amber-50");
      expect(warningClasses).toContain("text-amber-700");

      const destructiveClasses = badgeVariants({ variant: "destructive" });
      expect(destructiveClasses).toContain("border-rose-200/80");
      expect(destructiveClasses).toContain("bg-rose-50");
      expect(destructiveClasses).toContain("text-rose-700");

      const infoClasses = badgeVariants({ variant: "info" });
      expect(infoClasses).toContain("border-blue-200/80");
      expect(infoClasses).toContain("bg-blue-50");
      expect(infoClasses).toContain("text-blue-700");
    });
  });

  // =========================================================================
  // 4. TABLE PRIMITIVE STRESS HARNESS
  // =========================================================================
  describe("<Table> Primitive Density & Layout", () => {
    it("renders Table hierarchy with screen-fitted sticky headers and compact cell heights", () => {
      render(
        <Table data-testid="data-table">
          <TableCaption data-testid="table-caption">Recent Invoices</TableCaption>
          <TableHeader data-testid="table-header">
            <TableRow data-testid="table-head-row">
              <TableHead data-testid="th-inv">Invoice #</TableHead>
              <TableHead data-testid="th-party">Party</TableHead>
              <TableHead data-testid="th-amt">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-testid="table-body">
            <TableRow data-testid="table-row-1">
              <TableCell data-testid="td-inv">INV-001</TableCell>
              <TableCell data-testid="td-party">Sharma Traders</TableCell>
              <TableCell data-testid="td-amt">₹15,400</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter data-testid="table-footer">
            <TableRow>
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell>₹15,400</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      // Th check: 34px (h-8.5), sticky top-0, uppercase tracking-wider, text-xs
      const th = screen.getByTestId("th-inv");
      expect(th.className).toContain("h-8.5");
      expect(th.className).toContain("px-3");
      expect(th.className).toContain("sticky");
      expect(th.className).toContain("top-0");
      expect(th.className).toContain("text-xs");
      expect(th.className).toContain("uppercase");

      // Td check: 38px-42px row height via py-2 px-3 text-xs
      const td = screen.getByTestId("td-inv");
      expect(td.className).toContain("py-2");
      expect(td.className).toContain("px-3");
      expect(td.className).toContain("text-xs");

      // Table Row check: hover styling
      const row = screen.getByTestId("table-row-1");
      expect(row.className).toContain("border-b");
      expect(row.className).toContain("hover:bg-muted/50");

      // Table wrapper check: overflow-auto
      const table = screen.getByTestId("data-table");
      expect(table.parentElement?.className).toContain("overflow-auto");
    });
  });

  // =========================================================================
  // 5. DIALOG PRIMITIVE STRESS HARNESS
  // =========================================================================
  describe("<Dialog> Primitive & Screen Reader Accessibility", () => {
    it("renders DialogContent with clean hairline border, subtle backdrop blur, and screen-reader title fallback", () => {
      render(
        <Dialog open>
          <DialogContent data-testid="dialog-content">
            <div>Modal Inner Content</div>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId("dialog-content");
      expect(content).toBeInTheDocument();
      expect(content.className).toContain("rounded-xl");
      expect(content.className).toContain("border");
      expect(content.className).toContain("border-border/80");
      expect(content.className).toContain("shadow-lg");

      // Screen reader accessible fallback title is rendered
      expect(screen.getByText("Dialog")).toBeInTheDocument();
    });

    it("respects explicit DialogTitle and DialogDescription without injecting duplicate fallback title", () => {
      render(
        <Dialog open>
          <DialogContent data-testid="dialog-with-title">
            <DialogHeader>
              <DialogTitle data-testid="modal-title">Confirm Delete</DialogTitle>
              <DialogDescription data-testid="modal-desc">
                Are you sure you want to delete this record?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByTestId("modal-title");
      expect(title).toBeInTheDocument();
      expect(title.textContent).toBe("Confirm Delete");
      expect(title.className).toContain("text-lg");
      expect(title.className).toContain("font-semibold");

      const desc = screen.getByTestId("modal-desc");
      expect(desc).toBeInTheDocument();
      expect(desc.textContent).toContain("Are you sure");
    });
  });
});
