import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { FilterArticlesDto } from './dto/filter-articles.dto';

const CACHE_PREFIX = 'articles';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(dto: CreateArticleDto, authorId: number): Promise<Article> {
    const article = this.articlesRepository.create({
      ...dto,
      authorId,
    });
    const saved = await this.articlesRepository.save(article);
    await this.invalidateListCache();
    return this.findOne(saved.id);
  }

  async findAll(filters: FilterArticlesDto) {
    const { page = 1, limit = 10, authorName, authorId, publishedFrom, publishedTo, search } = filters;

    const cacheKey = `${CACHE_PREFIX}:list:${JSON.stringify(filters)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const qb = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author');

    if (authorId) {
      qb.andWhere('article.authorId = :authorId', { authorId });
    }

    if (authorName) {
      qb.andWhere('author.name ILIKE :authorName', {
        authorName: `%${authorName}%`,
      });
    }

    if (publishedFrom) {
      qb.andWhere('article.publishedAt >= :publishedFrom', { publishedFrom });
    }

    if (publishedTo) {
      qb.andWhere('article.publishedAt <= :publishedTo', { publishedTo });
    }

    if (search) {
      qb.andWhere(
        '(article.title ILIKE :search OR article.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('article.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    const result = {
      data: data.map((article) => this.sanitizeArticle(article)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.cacheManager.set(cacheKey, result, 60);
    return result;
  }

  async findOne(id: number): Promise<Article> {
    const cacheKey = `${CACHE_PREFIX}:${id}`;
    const cached = await this.cacheManager.get<Article>(cacheKey);
    if (cached) {
      return cached;
    }

    const article = await this.articlesRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!article) {
      throw new NotFoundException(`Article #${id} not found`);
    }

    const sanitized = this.sanitizeArticle(article);
    await this.cacheManager.set(cacheKey, sanitized, 60);
    return sanitized;
  }

  async update(id: number, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.articlesRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article #${id} not found`);
    }

    Object.assign(article, dto);
    await this.articlesRepository.save(article);

    await this.invalidateArticleCache(id);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.articlesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Article #${id} not found`);
    }
    await this.invalidateArticleCache(id);
  }

  private async invalidateArticleCache(id: number): Promise<void> {
    await this.cacheManager.del(`${CACHE_PREFIX}:${id}`);
    await this.invalidateListCache();
  }

  private async invalidateListCache(): Promise<void> {
    // Сбрасываем кэш списков через reset всего store,
    // либо используем паттерн ключей. Для простоты — reset.
    // В продакшене лучше использовать Redis SCAN + DEL по паттерну.
    const store = (this.cacheManager as any).store;
    if (store?.keys) {
      const keys: string[] = await store.keys(`${CACHE_PREFIX}:list:*`);
      for (const key of keys) {
        await this.cacheManager.del(key);
      }
    }
  }

  /** Убираем пароль автора из ответа */
  private sanitizeArticle(article: Article): any {
    if (article.author) {
      const { password, ...authorSafe } = article.author;
      return { ...article, author: authorSafe };
    }
    return article;
  }
}
