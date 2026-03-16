import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let repository: Record<string, jest.Mock>;
  let cacheManager: Record<string, jest.Mock>;

  const mockAuthor = { id: 1, email: 'test@test.com', name: 'Author' };
  const mockArticle: Partial<Article> = {
    id: 1,
    title: 'Test Article',
    description: 'Test description for article',
    publishedAt: new Date(),
    authorId: 1,
    author: mockAuthor as any,
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn().mockReturnValue(mockArticle),
      save: jest.fn().mockResolvedValue(mockArticle),
      findOne: jest.fn().mockResolvedValue(mockArticle),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };

    cacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: getRepositoryToken(Article), useValue: repository },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  describe('create', () => {
    it('should create an article and invalidate list cache', async () => {
      const dto = { title: 'Test Article', description: 'Test description for article' };

      const result = await service.create(dto, 1);

      expect(repository.create).toHaveBeenCalledWith({ ...dto, authorId: 1 });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return article from cache if available', async () => {
      cacheManager.get.mockResolvedValue(mockArticle);

      const result = await service.findOne(1);

      expect(result).toEqual(mockArticle);
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['author'],
      });
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if article does not exist', async () => {
      cacheManager.get.mockResolvedValue(null);
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return cached list if available', async () => {
      const cachedResult = { data: [mockArticle], meta: { total: 1 } };
      cacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(cachedResult);
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should query DB with filters when cache is empty', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockArticle], 1]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        authorId: 1,
        search: 'test',
      }) as any;

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockQb.andWhere).toHaveBeenCalledTimes(2); // authorId + search
      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update article and invalidate cache', async () => {
      const dto = { title: 'Updated Title' };

      const result = await service.update(1, dto);

      expect(repository.save).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalledWith('articles:1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if article not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { title: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete article and invalidate cache', async () => {
      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
      expect(cacheManager.del).toHaveBeenCalledWith('articles:1');
    });

    it('should throw NotFoundException if article not found', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
