package cn.toside.music.mobile.utils;

import android.content.Context;
import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class AlarmClockBridge {
  private static final String TAG = "AlarmClockBridge";

  @Nullable
  private static ReactApplicationContext reactContext;

  public static void setReactContext(ReactApplicationContext context) {
    reactContext = context;
  }

  public static boolean hasActiveReactInstance() {
    ReactApplicationContext currentContext = reactContext;
    return currentContext != null && currentContext.hasActiveReactInstance();
  }

  public static boolean emitTriggerIfPossible(Context context, long timestamp) {
    ReactApplicationContext currentContext = reactContext;
    if (currentContext == null || !currentContext.hasActiveReactInstance()) {
      Log.d(TAG, "Skip emit, React context is not active. ts=" + timestamp);
      return false;
    }

    WritableMap params = Arguments.createMap();
    params.putDouble("timestamp", timestamp);
    currentContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
      .emit("alarm-trigger", params);
    AlarmClockScheduler.clearPendingTrigger(context);
    Log.d(TAG, "Emit trigger to JS. ts=" + timestamp);
    return true;
  }
}
