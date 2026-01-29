'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/admin/AdminLayout';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  ExternalLink,
  Globe,
  FolderOpen
} from 'lucide-react';
import { Project, PROJECT_STATUS_LABELS } from '../../../types/project';
import { getProjects, deleteProject, getProjectsStats } from '../../../lib/projects';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    byStatus: {
      active: 0,
      draft: 0,
      inactive: 0
    }
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchQuery]);

  const loadProjects = async () => {
    try {
      const allProjects = await getProjects();
      setProjects(allProjects);
      const projectStats = await getProjectsStats();
      setStats({
        total: projectStats.total,
        byStatus: projectStats.byStatus
      });
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const filterProjects = () => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
      return;
    }

    const filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProjects(filtered);
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот проект?')) {
      try {
        await deleteProject(id);
        await loadProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Ошибка при удалении проекта');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'draft': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'inactive': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <AdminLayout 
      title="Управление проектами"
      description="Создание и управление проектами"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Проекты
            </h1>
            <p className="text-gray-400 text-sm">
              Управление проектами платформы
            </p>
          </div>
          <button 
            onClick={() => router.push('/admin/projects/create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus className="h-4 w-4" />
            Создать проект
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Всего:</span>
            <span className="text-white font-semibold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-500 text-sm">Активные:</span>
            <span className="text-emerald-400 font-semibold">{stats.byStatus.active}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-gray-500 text-sm">Черновики:</span>
            <span className="text-amber-400 font-semibold">{stats.byStatus.draft}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-500 text-sm">Неактивные:</span>
            <span className="text-red-400 font-semibold">{stats.byStatus.inactive}</span>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Поиск проектов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
            />
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              className="group rounded-2xl bg-white/5 border border-white/5 overflow-hidden hover:bg-white/[0.07] hover:border-white/10 transition-all"
            >
              {/* Project Image */}
              {project.image && (
                <div className="aspect-video bg-black/20 overflow-hidden">
                  <img 
                    src={project.image} 
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                      {project.description}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(project.status)}`}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {project.category}
                  </span>
                </div>

                {/* Links */}
                {(project.website || project.telegramPost) && (
                  <div className="flex items-center gap-2 mb-4">
                    {project.website && (
                      <a 
                        href={project.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {project.telegramPost && (
                      <a 
                        href={project.telegramPost} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                  <button 
                    onClick={() => router.push(`/project/${project.id}`)}
                    className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs"
                  >
                    <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">Просмотр</span>
                  </button>
                  <button 
                    onClick={() => router.push(`/admin/projects/${project.id}/edit`)}
                    className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all text-xs"
                  >
                    <Edit className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">Изменить</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteProject(project.id)}
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/5 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-8 w-8 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-4">
              {searchQuery ? 'Проекты не найдены' : 'Проекты не созданы'}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => router.push('/admin/projects/create')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all"
              >
                <Plus className="h-4 w-4" />
                Создать первый проект
              </button>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
