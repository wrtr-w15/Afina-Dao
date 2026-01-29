'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/LayoutComponent';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getProjects } from '@/lib/projects';
import { Project, PROJECT_CATEGORY_LABELS, PROJECT_CATEGORY_COLORS } from '@/types/project';
import Link from 'next/link';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const allProjects = await getProjects();
        const activeProjects = allProjects.filter(project => project.status === 'active');
        setProjects(activeProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setVisible(true);
          });
        });
      }
    };

    loadProjects();
  }, []);

  const getCategoryLabel = (category: string): string => {
    return PROJECT_CATEGORY_LABELS[category as keyof typeof PROJECT_CATEGORY_LABELS] || category;
  };

  const getCategoryColor = (category: string): string => {
    return PROJECT_CATEGORY_COLORS[category as keyof typeof PROJECT_CATEGORY_COLORS] || 'text-gray-600 bg-gray-900/20';
  };

  return (
    <Layout 
      title="Проекты"
      description="Список всех проектов Afina DAO"
    >
      <div className="px-4">
        {loading ? (
          <div className="flex flex-wrap justify-center gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="relative group w-[300px] flex-shrink-0">
                <div className="absolute -inset-[1px] bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-pink-500/50 rounded-2xl opacity-0 blur-sm" />
                <div className="relative overflow-hidden rounded-2xl bg-slate-900/80">
                  <div className="w-full aspect-[16/9] bg-gray-800 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4" />
                    <div className="h-6 bg-gray-700 rounded animate-pulse w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-5">
            {projects.map((project, index) => (
              <Link key={project.id} href={`/project/${project.id}`} className="block">
                <div 
                  className="relative group w-[300px] flex-shrink-0"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(20px)',
                    transition: `opacity 0.5s ease-out ${index * 0.08}s, transform 0.5s ease-out ${index * 0.08}s`,
                  }}
                >
                  {/* Glow effect */}
                  <div className="absolute -inset-[1px] bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-75 blur-sm transition-opacity duration-500" />
                  
                  {/* Card content */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 group-hover:border-white/20 transition-all duration-500">
                    {/* Image */}
                    <div className="w-full aspect-[16/9] bg-gray-800 overflow-hidden">
                      {project.image ? (
                        <img 
                          src={project.image} 
                          alt={project.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                          <span className="text-5xl font-bold text-white/20">
                            {project.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-base font-semibold text-white line-clamp-1 group-hover:text-blue-200 transition-colors">
                        {project.name}
                      </h3>
                      <Badge className={`${getCategoryColor(project.category)} text-xs px-2.5 py-1 rounded-lg`}>
                        {getCategoryLabel(project.category)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center bg-white/5 border border-white/10">
            <p className="text-gray-400">
              Проекты не найдены
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
