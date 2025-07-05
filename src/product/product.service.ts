import { ConflictException, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Product } from './schema/product.schema';
import { InjectModel } from '@nestjs/mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductQueryDto } from './dto/get-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  // Create Product
  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Check if product already exists to provided slug
    const existingProduct = await this.productModel
      .findOne({ slug: createProductDto.slug })
      .exec();
    if (existingProduct) {
      throw new ConflictException(
        `Product with slug ${createProductDto.slug} already exists`,
      );
    }
    const newProduct = new this.productModel({
      ...createProductDto,
      isActive: createProductDto?.isActive ?? true,
      isFeatured: createProductDto?.isFeatured ?? false,
      stock: createProductDto?.stock ?? 1,
    });
    return newProduct.save();
  }
}
