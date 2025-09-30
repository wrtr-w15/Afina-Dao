import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { ArticleTranslation } from './entities/article-translation.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private articlesRepository: Repository<Article>,
    @InjectRepository(ArticleTranslation)
    private translationsRepository: Repository<ArticleTranslation>,
  ) {}

  async create(createArticleDto: CreateArticleDto, authorId: number): Promise<Article> {
    const article = this.articlesRepository.create({
      ...createArticleDto,
      authorId,
    });

    const savedArticle = await this.articlesRepository.save(article);

    // Create translations
    for (const translationDto of createArticleDto.translations) {
      const translation = this.translationsRepository.create({
        ...translationDto,
        articleId: savedArticle.id,
      });
      await this.translationsRepository.save(translation);
    }

    return this.findOne(savedArticle.id);
  }

  async findAll(language?: string, categoryId?: number): Promise<Article[]> {
    const query = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.translations', 'translations')
      .where('article.isPublished = :isPublished', { isPublished: true });

    if (categoryId) {
      query.andWhere('article.categoryId = :categoryId', { categoryId });
    }

    if (language) {
      query.andWhere('translations.language = :language', { language });
    }

    return query.getMany();
  }

  async findOne(id: number, language?: string): Promise<Article> {
    const query = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.translations', 'translations')
      .where('article.id = :id', { id });

    if (language) {
      query.andWhere('translations.language = :language', { language });
    }

    const article = await query.getOne();

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return article;
  }

  async findBySlug(slug: string, language?: string): Promise<Article> {
    const query = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.translations', 'translations')
      .where('article.slug = :slug', { slug })
      .andWhere('article.isPublished = :isPublished', { isPublished: true });

    if (language) {
      query.andWhere('translations.language = :language', { language });
    }

    const article = await query.getOne();

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Increment views
    await this.articlesRepository.increment({ id: article.id }, 'views', 1);

    return article;
  }

  async update(id: number, updateArticleDto: UpdateArticleDto): Promise<Article> {
    const article = await this.findOne(id);

    Object.assign(article, updateArticleDto);
    await this.articlesRepository.save(article);

    // Update translations if provided
    if (updateArticleDto.translations) {
      // Remove existing translations
      await this.translationsRepository.delete({ articleId: id });

      // Create new translations
      for (const translationDto of updateArticleDto.translations) {
        const translation = this.translationsRepository.create({
          ...translationDto,
          articleId: id,
        });
        await this.translationsRepository.save(translation);
      }
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const article = await this.findOne(id);
    await this.articlesRepository.remove(article);
  }

  async like(id: number): Promise<Article> {
    await this.articlesRepository.increment({ id }, 'likes', 1);
    return this.findOne(id);
  }
}
