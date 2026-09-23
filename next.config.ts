import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["date-fns", "lucide-react", "react-icons", "recharts"],
  },
};

export default nextConfig;
