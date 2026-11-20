import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Island, IslandSchema } from './schemas/island.schema';
import { TotemState, TotemStateSchema } from './schemas/totem-state.schema';
import { TotemLog, TotemLogSchema } from './schemas/totem-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Island.name, schema: IslandSchema },
      { name: TotemState.name, schema: TotemStateSchema },
      { name: TotemLog.name, schema: TotemLogSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
