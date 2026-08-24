package com.anonymous.travelplanner

import android.app.Activity
import android.content.Intent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class IncomingCallActivity : Activity() {
  private val timeoutHandler = Handler(Looper.getMainLooper())
  private val timeout = Runnable { closeCallScreen() }
  private var endedReceiverRegistered = false
  private val endedReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      val endedGroupId = intent.getStringExtra("groupId")
      if (endedGroupId == this@IncomingCallActivity.intent.getStringExtra("groupId")) {
        closeCallScreen()
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Notification action buttons must open an Activity directly on Android 12+.
    // Starting MainActivity from a notification BroadcastReceiver is treated as a
    // notification trampoline and can be blocked by the OS.
    if (intent.action == CallActionReceiver.ACCEPT) {
      acceptCall(intent)
      return
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(
        endedReceiver,
        IntentFilter(TravelNotifications.CALL_ENDED_ACTION),
        Context.RECEIVER_NOT_EXPORTED,
      )
    } else {
      @Suppress("DEPRECATION")
      registerReceiver(endedReceiver, IntentFilter(TravelNotifications.CALL_ENDED_ACTION))
    }
    endedReceiverRegistered = true

    val groupId = intent.getStringExtra("groupId").orEmpty()
    val media = intent.getStringExtra("media") ?: "audio"
    val caller = intent.getStringExtra("caller") ?: "Thành viên nhóm"
    val groupName = intent.getStringExtra("groupName") ?: "Nhóm"
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(48, 72, 48, 72)
      setBackgroundColor(Color.rgb(17, 19, 21))
    }
    root.addView(TextView(this).apply {
      text = caller.take(1).uppercase()
      textSize = 42f
      gravity = Gravity.CENTER
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.rgb(22, 135, 248))
      layoutParams = LinearLayout.LayoutParams(180, 180).apply { bottomMargin = 36 }
    })
    root.addView(TextView(this).apply {
      text = caller
      textSize = 26f
      gravity = Gravity.CENTER
      setTextColor(Color.WHITE)
    })
    root.addView(TextView(this).apply {
      text = "Cuộc gọi ${if (media == "video") "video" else "thoại"} từ $groupName"
      textSize = 16f
      gravity = Gravity.CENTER
      setTextColor(Color.LTGRAY)
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply { topMargin = 16; bottomMargin = 72 }
    })
    val actions = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
    }
    actions.addView(Button(this).apply {
      text = "Từ chối"
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.rgb(220, 38, 38))
      setOnClickListener {
        TravelNotifications.cancelIncomingCall(this@IncomingCallActivity, groupId)
        closeCallScreen()
      }
      layoutParams = LinearLayout.LayoutParams(0, 140, 1f).apply { marginEnd = 18 }
    })
    actions.addView(Button(this).apply {
      text = "Nhận"
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.rgb(22, 163, 74))
      setOnClickListener {
        acceptCall(intent)
      }
      layoutParams = LinearLayout.LayoutParams(0, 140, 1f).apply { marginStart = 18 }
    })
    root.addView(actions, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT,
    ))
    setContentView(root)
    timeoutHandler.postDelayed(timeout, 45_000)
  }

  override fun onNewIntent(newIntent: Intent) {
    super.onNewIntent(newIntent)
    setIntent(newIntent)
    if (newIntent.action == CallActionReceiver.ACCEPT) {
      acceptCall(newIntent)
    }
  }

  private fun acceptCall(sourceIntent: Intent) {
    val groupId = sourceIntent.getStringExtra("groupId").orEmpty()
    if (groupId.isBlank()) {
      closeCallScreen()
      return
    }
    val media = sourceIntent.getStringExtra("media") ?: "audio"
    TravelNotifications.cancelIncomingCall(this, groupId)
    startActivity(Intent(this, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      data = TravelNotifications.callDeepLink(groupId, media)
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP,
      )
    })
    closeCallScreen()
  }

  private fun closeCallScreen() {
    // This activity has a dedicated task affinity, so removing its task cannot
    // close or replace the application's MainActivity task.
    finishAndRemoveTask()
  }

  override fun onDestroy() {
    timeoutHandler.removeCallbacks(timeout)
    if (endedReceiverRegistered) {
      runCatching { unregisterReceiver(endedReceiver) }
      endedReceiverRegistered = false
    }
    super.onDestroy()
  }
}
