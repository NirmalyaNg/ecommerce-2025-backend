import { Module } from '@nestjs/common';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Address, AddressSchema } from './schema/address.schema';

@Module({
  controllers: [AddressController],
  imports: [MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }])],
  providers: [AddressService],
  exports: [MongooseModule],
})
export class AddressModule {}
