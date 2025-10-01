'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Users,
  Code,
  ExternalLink,
  Github,
  Globe
} from 'lucide-react';
import { Project, PROJECT_STATUS_LABELS, PROJECT_CATEGORY_LABELS, PROJECT_STATUS_COLORS, PROJECT_CATEGORY_COLORS, OS_COMPATIBILITY_LABELS, OS_COMPATIBILITY_ICONS } from '../../../types/project';
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
    },
    byCategory: {
      defi: 0,
      nft: 0,
      gaming: 0,
      dao: 0,
      infrastructure: 0,
      tools: 0,
      other: 0
    },
    averageProgress: 0
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
      setStats(projectStats);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <AdminLayout 
      title="Управление проектами"
      description="Создание и управление проектами"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Управление проектами
            </h1>
          </div>
          <Button size="sm" onClick={() => router.push('/admin/projects/create')}>
            <Plus className="h-3 w-3 mr-1" />
            Создать
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Всего: <span className="font-semibold text-blue-600">{stats.total}</span></span>
          <span>Активные: <span className="font-semibold text-green-600">{stats.byStatus.active}</span></span>
          <span>Черновики: <span className="font-semibold text-yellow-600">{stats.byStatus.draft}</span></span>
          <span>Неактивные: <span className="font-semibold text-red-600">{stats.byStatus.inactive}</span></span>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <Input
            placeholder="Поиск проектов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="text-sm"
          />
        </div>

        {/* Projects List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={PROJECT_STATUS_COLORS[project.status]}>
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
              </div>





              {/* Links */}
              <div className="flex items-center space-x-2 mb-4">
                {project.website && (
                  <a 
                    href={project.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {project.telegramPost && (
                  <a 
                    href={project.telegramPost} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>


              {/* Actions */}
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/admin/projects/${project.id}`)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Просмотр
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/admin/projects/${project.id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Редактировать
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteProject(project.id)}
                  className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Проекты не найдены' : 'Проекты не созданы'}
            </div>
            {!searchQuery && (
              <Button 
                className="mt-4"
                onClick={() => router.push('/admin/projects/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Создать первый проект
              </Button>
            )}
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
