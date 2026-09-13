"use client";

import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import SearchFilters from "@/components/SearchFilters";
import { fetchAllReviews, fetchCategories } from "@/lib/data";
import type { Review, Category } from "@/lib/types";
import { useEffect } from "react";

function parsePrice(price: string): number {
  const match = price.replace(/\./g, "").match(/[\d,]+/);
  if (!match) return 0;
  return parseFloat(match[0].replace(",", "."));
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    minPrice: 0,
    maxPrice: 10000,
    minScore: 0,
  });

  useEffect(() => {
    Promise.all([fetchAllReviews(), fetchCategories()]).then(([r, c]) => {
      setReviews(r);
      setCategories(c);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (
        filters.search &&
        !r.product.toLowerCase().includes(filters.search.toLowerCase()) &&
        !r.hero_lead.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (filters.category && r.category !== filters.category) return false;
      const price = parsePrice(r.price_new);
      if (price < filters.minPrice) return false;
      if (price > filters.maxPrice && filters.maxPrice < 10000) return false;
      if (filters.minScore > 0 && r.verdict_score < filters.minScore) return false;
      return true;
    });
  }, [reviews, filters]);

  return (
    <>
      <Navbar />
      <main className="container py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Reviews</h1>
          <p className="text-[var(--muted)]">
            Análises detalhadas para você escolher com confiança.
          </p>
        </div>

        <div className="mb-8">
          <SearchFilters categories={categories} onFilterChange={setFilters} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-[var(--surface)] rounded-2xl h-80 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--muted)] text-lg">
              Nenhum review encontrado com esses filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((review) => (
              <ReviewCard key={review.slug} review={review} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
