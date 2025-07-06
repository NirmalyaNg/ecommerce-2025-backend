import { ConflictException, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Product } from './schema/product.schema';
import { InjectModel } from '@nestjs/mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductDto } from './dto/get-product.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    private configService: ConfigService,
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

  // Get Paginated Products
  async getPaginatedProducts(getProductDto: GetProductDto) {
    const { limit: dtoLimit, page: dtoPage } = getProductDto;

    const limit =
      dtoLimit ??
      this.configService.get<number>('DEFAULT_PRODUCT_PAGE_LIMIT') ??
      10;
    const page = dtoPage ?? 1;
    const skip = (page - 1) * limit;

    const productsQuery = this.productModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const [products, totalProducts] = await Promise.all([
      productsQuery.exec(),
      this.productModel.countDocuments().exec(),
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    return {
      products,
      pagination: {
        page,
        total: totalProducts,
        totalPages,
        limit,
      },
    };
  }
}
