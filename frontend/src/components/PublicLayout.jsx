import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EarlyBirdBanner from "@/components/EarlyBirdBanner";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <EarlyBirdBanner />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
