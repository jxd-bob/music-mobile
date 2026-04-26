package cn.toside.music.mobile.utils;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import cn.toside.music.mobile.MainActivity;

public class AlarmClockScheduler {
  private static final String TAG = "AlarmClockScheduler";
  private static final String PREFS_NAME = "lx_alarm_clock";
  private static final String KEY_TIMESTAMP = "timestamp";
  private static final String KEY_ALARM_TIME = "alarm_time";
  private static final String KEY_PENDING_TRIGGER_TIMESTAMP = "pending_trigger_timestamp";
  private static final int REQUEST_CODE_TRIGGER = 16001;
  private static final int REQUEST_CODE_SHOW = 16002;

  public static final String ACTION_TRIGGER = "cn.toside.music.mobile.action.ALARM_CLOCK_TRIGGER";
  public static final String EXTRA_TRIGGER_TIMESTAMP = "extra_trigger_timestamp";

  private static SharedPreferences getPrefs(Context context) {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
  }

  private static PendingIntent buildTriggerPendingIntent(Context context, long timestamp) {
    Intent intent = new Intent(context, AlarmClockTriggerReceiver.class);
    intent.setAction(ACTION_TRIGGER);
    intent.putExtra(EXTRA_TRIGGER_TIMESTAMP, timestamp);
    return PendingIntent.getBroadcast(
      context,
      REQUEST_CODE_TRIGGER,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  private static PendingIntent buildShowPendingIntent(Context context) {
    Intent intent = new Intent(context, MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return PendingIntent.getActivity(
      context,
      REQUEST_CODE_SHOW,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  public static void schedule(Context context, long timestamp, String alarmTime) {
    AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarmManager == null) return;
    PendingIntent triggerIntent = buildTriggerPendingIntent(context, timestamp);
    PendingIntent showIntent = buildShowPendingIntent(context);
    AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(timestamp, showIntent);
    alarmManager.setAlarmClock(info, triggerIntent);
    Log.d(TAG, "Schedule alarm. ts=" + timestamp + ", time=" + alarmTime);
    getPrefs(context).edit()
      .putLong(KEY_TIMESTAMP, timestamp)
      .putString(KEY_ALARM_TIME, alarmTime)
      .apply();
  }

  public static void cancel(Context context) {
    AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarmManager != null) {
      alarmManager.cancel(buildTriggerPendingIntent(context, 0));
    }
    Log.d(TAG, "Cancel alarm.");
    getPrefs(context).edit()
      .remove(KEY_TIMESTAMP)
      .remove(KEY_ALARM_TIME)
      .remove(KEY_PENDING_TRIGGER_TIMESTAMP)
      .apply();
  }

  public static void restore(Context context) {
    SharedPreferences prefs = getPrefs(context);
    long timestamp = prefs.getLong(KEY_TIMESTAMP, 0);
    if (timestamp <= 0) return;
    String alarmTime = prefs.getString(KEY_ALARM_TIME, "07:30");
    long nextTimestamp = timestamp <= System.currentTimeMillis()
      ? System.currentTimeMillis() + 1000
      : timestamp;
    Log.d(TAG, "Restore alarm. ts=" + nextTimestamp + ", time=" + alarmTime);
    schedule(context, nextTimestamp, alarmTime);
  }

  public static void captureTriggerIntent(Context context, Intent intent) {
    if (intent == null) return;
    if (!ACTION_TRIGGER.equals(intent.getAction())) return;
    long timestamp = intent.getLongExtra(EXTRA_TRIGGER_TIMESTAMP, 0);
    if (timestamp <= 0) return;
    Log.d(TAG, "Capture activity trigger intent. ts=" + timestamp);
    recordPendingTrigger(context, timestamp);
    AlarmClockBridge.emitTriggerIfPossible(context, timestamp);
  }

  public static void recordPendingTrigger(Context context, long timestamp) {
    Log.d(TAG, "Record pending trigger. ts=" + timestamp);
    getPrefs(context).edit()
      .putLong(KEY_PENDING_TRIGGER_TIMESTAMP, timestamp)
      .apply();
  }

  public static long consumePendingTriggerTimestamp(Context context) {
    SharedPreferences prefs = getPrefs(context);
    long timestamp = prefs.getLong(KEY_PENDING_TRIGGER_TIMESTAMP, 0);
    if (timestamp > 0) {
      prefs.edit().remove(KEY_PENDING_TRIGGER_TIMESTAMP).apply();
    }
    return timestamp;
  }

  public static void clearPendingTrigger(Context context) {
    getPrefs(context).edit()
      .remove(KEY_PENDING_TRIGGER_TIMESTAMP)
      .apply();
  }
}
