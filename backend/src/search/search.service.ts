import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/entities/article.entity';
import { ArticleTranslation } from '../articles/entities/article-translation.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Article)
    private articlesRepository: Repository<Article>,
    @InjectRepository(ArticleTranslation)
    private translationsRepository: Repository<ArticleTranslation>,
  ) {}

  async searchArticles(query: string, language?: string, categoryId?: number): Promise<Article[]> {
    const searchQuery = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.translations', 'translations')
      .where('article.isPublished = :isPublished', { isPublished: true })
      .andWhere(
        '(translations.title LIKE :query OR translations.content LIKE :query OR translations.excerpt LIKE :query)',
        { query: `%${query}%` }
      );

    if (language) {
      searchQuery.andWhere('translations.language = :language', { language });
    }

    if (categoryId) {
      searchQuery.andWhere('article.categoryId = :categoryId', { categoryId });
    }

    return searchQuery.getMany();
  }

  async getPopularArticles(language?: string, limit: number = 10): Promise<Article[]> {
    const query = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.translations', 'translations')
      .where('article.isPublished = :isPublished', { isPublished: true })
      .orderBy('article.views', 'DESC')
      .addOrderBy('article.likes', 'DESC')
      .limit(limit);

    if (language) {
      query.andWhere('translations.language = :language', { language });
    }

    return query.getMany();
  }

  async getRecentArticles(language?: string, limit: number = 10): Promise<Article[]> {
    const query = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.translations', 'translations')
      .where('article.isPublished = :isPublished', { isPublished: true })
      .orderBy('article.createdAt', 'DESC')
      .limit(limit);

    if (language) {
      query.andWhere('translations.language = :language', { language });
    }

    return query.getMany();
  }
}
