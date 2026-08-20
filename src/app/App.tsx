import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { Header } from "@/app/components/header";
import { HeroSection } from "@/app/components/hero-section";
const ProductsSection = lazy(() =>
  import("@/app/components/products-section").then((module) => ({
    default: module.ProductsSection,
  })),
);
const ReportsSection = lazy(() =>
  import("@/app/components/reports-section").then((module) => ({
    default: module.ReportsSection,
  })),
);
const EcosystemSection = lazy(() =>
  import("@/app/components/ecosystem-section").then((module) => ({
    default: module.EcosystemSection,
  })),
);
const CTASection = lazy(() =>
  import("@/app/components/cta-section").then((module) => ({
    default: module.CTASection,
  })),
);
const Footer = lazy(() =>
  import("@/app/components/footer").then((module) => ({
    default: module.Footer,
  })),
);

function DeferredSection({ component: Component }: { component: ComponentType }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "520px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={ref}>
      {shouldLoad ? (
        <Suspense fallback={<div className="min-h-20" />}>
          <Component />
        </Suspense>
      ) : (
        <div className="min-h-20" aria-hidden="true" />
      )}
    </div>
  );
}

function SectionDivider() {
  return (
    <div className="px-4 sm:px-6" aria-hidden="true">
      <div className="homepage-section-divider mx-auto max-w-7xl" />
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="relative overflow-hidden">
        <div className="homepage-network-field" aria-hidden="true" />
        <div className="relative z-10">
          <HeroSection />
          <SectionDivider />
          <DeferredSection component={ProductsSection} />
          <SectionDivider />
          <DeferredSection component={ReportsSection} />
          <SectionDivider />
          <DeferredSection component={EcosystemSection} />
          <SectionDivider />
          <DeferredSection component={CTASection} />
        </div>
      </main>
      <SectionDivider />
      <DeferredSection component={Footer} />
    </div>
  );
}
