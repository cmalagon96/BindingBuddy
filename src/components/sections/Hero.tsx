"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-poke-dark py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-poke-blue opacity-[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-poke-yellow opacity-[0.04] rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative max-w-5xl mx-auto text-center"
      >
        <span className="inline-block bg-poke-blue/20 border border-poke-blue/40 text-poke-blue text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
          xTool Laser Engraved &middot; Made to Order
        </span>

        <h1 className="font-display text-5xl sm:text-7xl font-bold text-poke-text leading-[1.1] mb-6 tracking-tight">
          Your Pokemon.{" "}
          <span className="text-poke-yellow">Engraved.</span>
        </h1>

        <p className="text-poke-muted text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Custom laser-engraved Pokemon designs on premium binder covers,
          precision-cut with xTool. Built for collectors, by collectors.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button href="/products" variant="primary" className="px-8 py-4">
            Shop All Designs
          </Button>
          <Button href="#featured" variant="secondary" className="px-8 py-4">
            View Featured
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
