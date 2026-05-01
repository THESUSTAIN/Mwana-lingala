import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-sand-200">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
