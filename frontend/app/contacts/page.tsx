'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/LayoutComponent';
import { useTranslations } from 'next-intl';
import { Headphones, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import TelegramLogo from '@/components/contacts/TelegramLogo';
import DiscordLogo from '@/components/contacts/DiscordLogo';

interface ContactLinks {
  telegramChannelUrl: string;
  discordInviteUrl: string;
  supportTgUsernames: string[];
}

export default function ContactsPage() {
  const t = useTranslations('contacts');
  const [links, setLinks] = useState<ContactLinks | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/site-contact-links', { cache: 'no-cache' })
      .then((res) => res.json())
      .then((data) => {
        setLinks({
          telegramChannelUrl: data.telegramChannelUrl ?? '',
          discordInviteUrl: data.discordInviteUrl ?? '',
          supportTgUsernames: Array.isArray(data.supportTgUsernames) ? data.supportTgUsernames : [],
        });
      })
      .catch(() => {
        setLinks({
          telegramChannelUrl: '',
          discordInviteUrl: '',
          supportTgUsernames: ['kirjeyy', 'ascys'],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const hasChannel = links?.telegramChannelUrl?.trim();
  const hasDiscord = links?.discordInviteUrl?.trim();
  const hasSupport = links?.supportTgUsernames?.length;

  return (
    <Layout title={t('title')} description={t('description')}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">{t('title')}</h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">{t('description')}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#4d3dff]" />
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Telegram channel */}
            {hasChannel && (
              <Link
                href={links!.telegramChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-sky-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 rounded-3xl border border-white/10 group-hover:border-sky-400/30 transition-colors duration-300 bg-[#0a0a0f]/80 backdrop-blur-sm" />
                <div className="relative p-8 flex flex-col min-h-[220px]">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center ring-2 ring-white/10 group-hover:ring-sky-400/30 transition-all duration-300 shadow-xl">
                      <TelegramLogo size={44} className="drop-shadow-lg" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <ExternalLink className="h-4 w-4" />
                      {t('goToChannel')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">{t('telegramChannel')}</h2>
                  <p className="text-sm text-gray-400 leading-relaxed flex-1">{t('telegramChannelDesc')}</p>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <span className="text-sky-400 font-medium text-sm group-hover:text-sky-300 transition-colors">
                      t.me →
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Discord */}
            {hasDiscord && (
              <Link
                href={links!.discordInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 rounded-3xl border border-white/10 group-hover:border-indigo-400/30 transition-colors duration-300 bg-[#0a0a0f]/80 backdrop-blur-sm" />
                <div className="relative p-8 flex flex-col min-h-[220px]">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center ring-2 ring-white/10 group-hover:ring-indigo-400/30 transition-all duration-300 shadow-xl">
                      <DiscordLogo size={44} className="drop-shadow-lg" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <ExternalLink className="h-4 w-4" />
                      {t('goToServer')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">{t('discordServer')}</h2>
                  <p className="text-sm text-gray-400 leading-relaxed flex-1">{t('discordServerDesc')}</p>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <span className="text-indigo-400 font-medium text-sm group-hover:text-indigo-300 transition-colors">
                      discord.gg →
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Support */}
            {hasSupport ? (
              <div className="group relative flex flex-col rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm hover:border-[#ff007a]/30 transition-all duration-300 min-h-[220px]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff007a]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="relative p-8 flex flex-col flex-1">
                  <div className="flex items-start mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center ring-2 ring-white/10 group-hover:ring-[#ff007a]/30 transition-all duration-300 shadow-xl">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ff007a] to-[#c40060] flex items-center justify-center">
                        <Headphones className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">{t('support')}</h2>
                  <p className="text-sm text-gray-400 leading-relaxed mb-6">{t('supportDesc')}</p>
                  <div className="mt-auto flex flex-wrap gap-3">
                    {links!.supportTgUsernames.map((username) => (
                      <Link
                        key={username}
                        href={`https://t.me/${username.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-[#ff007a]/15 text-gray-200 hover:text-white border border-white/10 hover:border-[#ff007a]/40 transition-all duration-200 font-medium text-sm"
                      >
                        <TelegramLogo size={20} />
                        @{username}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {!loading && !hasChannel && !hasDiscord && !hasSupport && (
          <p className="text-center text-gray-500 py-12">{t('noLinksYet')}</p>
        )}
      </div>
    </Layout>
  );
}
