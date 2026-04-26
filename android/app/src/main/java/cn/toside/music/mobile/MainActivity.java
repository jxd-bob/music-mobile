package cn.toside.music.mobile;

import android.content.Intent;
import android.os.Bundle;

import com.reactnativenavigation.NavigationActivity;

import cn.toside.music.mobile.utils.AlarmClockScheduler;

public class MainActivity extends NavigationActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    AlarmClockScheduler.captureTriggerIntent(getApplicationContext(), getIntent());
    super.onCreate(savedInstanceState);
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    AlarmClockScheduler.captureTriggerIntent(getApplicationContext(), intent);
  }
}
