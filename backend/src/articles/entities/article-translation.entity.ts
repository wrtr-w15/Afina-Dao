import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Article } from './article.entity';

@Entity('article_translations')
export class ArticleTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  language: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column('text', { nullable: true })
  excerpt: string;

  @Column('text', { nullable: true })
  metaDescription: string;

  @ManyToOne(() => Article, article => article.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'articleId' })
  article: Article;

  @Column()
  articleId: number;
}
