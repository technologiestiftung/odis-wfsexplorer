"use client";

import type React from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-white py-8 border-t border-gray-200 ">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="space-y-8">
          {/* Project information section - using flex instead of grid for more consistent rendering */}
          <div className="flex flex-wrap">
            {/* Technologiestiftung Berlin */}
            <div className="sm:w-1/2 lg:w-1/4 px-2 mb-6">
              <p className="text-[var(--primary-color)] text-sm font-medium mb-2">
                {t("projectBy") || "Ein Projekt der"}
              </p>
              <a
                href="https://technologiestiftung-berlin.de"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img
                  src="https://logos.citylab-berlin.org/logo-technologiestiftung-berlin-de.svg"
                  alt="Technologiestiftung Berlin"
                  className="h-16 w-auto"
                />
              </a>
            </div>

            {/* ODIS Berlin */}
            <div className="sm:w-1/2 lg:w-1/4 px-2 mb-6">
              <p className="text-[var(--primary-color)] text-sm font-medium mb-2">
                {t("conductedBy") || "Durchgeführt von der"}
              </p>
              <a
                href="https://odis-berlin.de"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img
                  src="https://logos.citylab-berlin.org/logo-odis-berlin-coloured.svg"
                  alt="Open Data Informationsstelle Berlin"
                  className="h-14 w-auto"
                />
              </a>
            </div>

            {/* CityLAB Berlin */}
            <div className="sm:w-1/2 lg:w-1/4 px-2 mb-6">
              <p className="text-[var(--primary-color)] text-sm font-medium mb-2">
                {t("inCollaborationWith") || "in Zusammenarbeit mit"}
              </p>
              <a
                href="https://citylab-berlin.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img
                  src="./img/citylab.svg"
                  alt="CityLAB Berlin"
                  className="h-10 w-auto"
                />
              </a>
            </div>

            {/* Berlin Senate */}
            <div className="sm:w-1/2 lg:w-1/4 px-2 mb-6">
              <p className="text-[var(--primary-color)] text-sm font-medium mb-2">
                {t("fundedBy") || "Gefördert von"}
              </p>
              <a
                href="https://www.berlin.de/rbmskzl/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img
                  src="./img/berlin.svg"
                  alt="Der Regierende Bürgermeister von Berlin Senatskanzlei"
                  className="h-14 w-auto border border-gray-300"
                />
              </a>
            </div>
          </div>

          {/* Links section */}
          <div className="flex flex-wrap justify-start gap-4 sm:gap-6">
            <Link
              href="https://www.technologiestiftung-berlin.de/de/datenschutz/"
              className="text-[var(--primary-color)] hover:opacity-80 text-sm"
            >
              {t("privacyPolicy") || "Datenschutz"}
            </Link>
            <Link
              href="https://citylabberlin.typeform.com/to/g2c062v8"
              className="text-[var(--primary-color)] hover:opacity-80 text-sm"
            >
              {t("feedback") + " (de)" || "Feedback (en)"}
            </Link>

            <Link
              href="https://citylabberlin.typeform.com/to/fzugGwnn"
              className="text-[var(--primary-color)] hover:opacity-80 text-sm"
            >
              {t("feedback") + " (en)" || "Feedback (de)"}
            </Link>
            <a
              href="https://github.com/technologiestiftung/odis-wfsexplorer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary-color)] hover:opacity-80 text-sm"
            >
              {t("github") || "GitHub"}
            </a>
            <Link
              href="https://www.technologiestiftung-berlin.de/de/stiftung/kontakt-anfahrt/"
              className="text-[var(--primary-color)] hover:opacity-80 text-sm"
            >
              {t("contact") || "Kontakt"}
            </Link>
            <Link
              href="https://www.technologiestiftung-berlin.de/de/impressum/"
              className="text-[var(--primary-color)] hover:opacity-80 text-sm"
            >
              {t("imprint") || "Impressum"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
