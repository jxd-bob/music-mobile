package cn.toside.music.mobile.utils;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;

import cn.toside.music.mobile.R;

public class AlarmClockTaskService extends HeadlessJsTaskService {
  private static final String TAG = "AlarmClockTaskService";
  private static final String CHANNEL_ID = "lx_alarm_clock";
  private static final int NOTIFICATION_ID = 16003;
  public static final String TASK_KEY = "AlarmClockHeadlessTask";

  private static Notification createNotification(Context context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
      if (manager != null) {
        NotificationChannel channel = new NotificationChannel(
          CHANNEL_ID,
          context.getString(R.string.alarm_clock_service_channel_name),
          NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(context.getString(R.string.alarm_clock_service_channel_desc));
        manager.createNotificationChannel(channel);
      }
    }

    return new NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(context.getString(R.string.app_name))
      .setContentText(context.getString(R.string.alarm_clock_service_notification))
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setOngoing(true)
      .setSilent(true)
      .build();
  }

  public static void start(Context context, long timestamp) {
    Intent serviceIntent = new Intent(context, AlarmClockTaskService.class);
    serviceIntent.setAction(AlarmClockScheduler.ACTION_TRIGGER);
    serviceIntent.putExtra(AlarmClockScheduler.EXTRA_TRIGGER_TIMESTAMP, timestamp);
    HeadlessJsTaskService.acquireWakeLockNow(context);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent);
    } else {
      context.startService(serviceIntent);
    }
  }

  @Override
  public void onCreate() {
    super.onCreate();
    startForeground(NOTIFICATION_ID, createNotification(this));
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    long timestamp = intent == null ? 0 : intent.getLongExtra(AlarmClockScheduler.EXTRA_TRIGGER_TIMESTAMP, 0);
    if (timestamp > 0) {
      Log.d(TAG, "Start headless task service. ts=" + timestamp);
      AlarmClockScheduler.recordPendingTrigger(getApplicationContext(), timestamp);
      AlarmClockBridge.emitTriggerIfPossible(getApplicationContext(), timestamp);
    } else {
      Log.d(TAG, "Start headless task service without valid timestamp.");
    }
    super.onStartCommand(intent, flags, startId);
    return START_NOT_STICKY;
  }

  @Override
  protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
    if (intent == null) return null;
    if (!AlarmClockScheduler.ACTION_TRIGGER.equals(intent.getAction())) return null;
    long timestamp = intent.getLongExtra(AlarmClockScheduler.EXTRA_TRIGGER_TIMESTAMP, 0);
    if (timestamp <= 0) return null;
    WritableMap params = Arguments.createMap();
    params.putDouble("timestamp", timestamp);
    return new HeadlessJsTaskConfig(TASK_KEY, params, 60000, true);
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
    stopForeground(true);
  }
}
