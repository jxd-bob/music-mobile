package cn.toside.music.mobile.utils;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AlarmClockTriggerReceiver extends BroadcastReceiver {
  private static final String TAG = "AlarmClockTriggerRecv";

  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) return;
    if (!AlarmClockScheduler.ACTION_TRIGGER.equals(intent.getAction())) return;
    long timestamp = intent.getLongExtra(AlarmClockScheduler.EXTRA_TRIGGER_TIMESTAMP, 0);
    if (timestamp <= 0) return;

    Log.d(TAG, "Receive alarm trigger. ts=" + timestamp);
    AlarmClockScheduler.recordPendingTrigger(context, timestamp);
    if (AlarmClockBridge.emitTriggerIfPossible(context, timestamp)) return;
    AlarmClockTaskService.start(context, timestamp);
  }
}
