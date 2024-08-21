import { forwardRef, Module } from "@nestjs/common";
import { PrivatePluginService } from "./privatePlugin.service";
import { PrivatePluginResolver } from "./privatePlugin.resolver";
import { BlockModule } from "../block/block.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { ResourceModule } from "../resource/resource.module";
import { UserModule } from "../user/user.module";
import { BillingModule } from "../billing/billing.module";
@Module({
  imports: [
    UserModule,
    BillingModule,
    BlockModule,
    forwardRef(() => ResourceModule),
    PermissionsModule,
  ],
  providers: [PrivatePluginService, PrivatePluginResolver],
  exports: [PrivatePluginService, PrivatePluginResolver],
})
export class PrivatePluginModule {}
