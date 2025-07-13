import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Category } from './schema/category.schema';
import { Model } from 'mongoose';

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private readonly categoryModel: Model<Category>) {}

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find().exec();
  }

  async findById(categoryId: string): Promise<Category> {
    const category = await this.categoryModel.findById(categoryId).exec();
    if (!category) {
      throw new NotFoundException(`Category with id ${categoryId} not found!`);
    }
    return category;
  }
}
