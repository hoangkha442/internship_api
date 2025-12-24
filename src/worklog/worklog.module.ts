import { Module } from "@nestjs/common";
import { WorklogController } from "./worklog.controller";
import { WorklogService } from "./worklog.service";
import { CloudinaryModule } from "src/cloudinary/uploads.module";

@Module({
  imports: [CloudinaryModule],
  controllers: [WorklogController],
  providers: [WorklogService],
})
export class WorklogModule {}
