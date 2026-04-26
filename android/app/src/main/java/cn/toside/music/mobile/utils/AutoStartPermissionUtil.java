package cn.toside.music.mobile.utils;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;

public class AutoStartPermissionUtil {
  private static boolean canOpen(Context context, Intent intent) {
    return intent.resolveActivity(context.getPackageManager()) != null;
  }

  private static boolean tryStart(Context context, Intent intent) {
    if (!canOpen(context, intent)) return false;
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    try {
      context.startActivity(intent);
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  private static Intent createComponentIntent(String packageName, String className) {
    Intent intent = new Intent();
    intent.setComponent(new ComponentName(packageName, className));
    return intent;
  }

  public static boolean openAutoStartSettings(Context context, String packageName) {
    Intent[] intents = new Intent[] {
      createComponentIntent("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
      createComponentIntent("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity").putExtra("extra_pkgname", packageName),
      createComponentIntent("com.hyperos.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
      createComponentIntent("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
      createComponentIntent("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"),
      createComponentIntent("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"),
      createComponentIntent("com.oplus.safecenter", "com.oplus.safecenter.startupapp.StartupAppListActivity"),
      createComponentIntent("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
      createComponentIntent("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"),
      createComponentIntent("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
      createComponentIntent("com.hihonor.systemmanager", "com.hihonor.systemmanager.optimize.process.ProtectActivity"),
      createComponentIntent("com.meizu.safe", "com.meizu.safe.permission.PermissionMainActivity"),
    };

    for (Intent intent : intents) {
      intent.putExtra("packageName", packageName);
      intent.putExtra("pkgname", packageName);
      if (tryStart(context, intent)) return true;
    }

    Intent appDetailsIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
    appDetailsIntent.setData(Uri.parse("package:" + packageName));
    if (tryStart(context, appDetailsIntent)) return true;

    Intent manageIntent = new Intent(Settings.ACTION_SETTINGS);
    return tryStart(context, manageIntent);
  }
}
