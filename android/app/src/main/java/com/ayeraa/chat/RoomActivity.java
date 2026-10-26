package com.ayeraa.chat;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import com.ayeraa.chat.api.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class RoomActivity extends Activity {
    private String roomId;
    private String roomName;
    private String myId;
    private String myName;
    private String myAvatar;
    private String token;

    private TextView tvRoomTitle;
    private TextView tvRoomSubtitle;
    private ListView lvMessages;
    private EditText etInput;
    private Button btnSend;
    private MessageAdapter adapter;

    private final List<JSONObject> messageList = new ArrayList<>();
    private final Handler pollHandler = new Handler(Looper.getMainLooper());
    private boolean isPolling = false;
    private long lastTimestamp = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        roomId = getIntent().getStringExtra("room_id");
        roomName = getIntent().getStringExtra("room_name");
        if (roomId == null) roomId = "general";
        if (roomName == null) roomName = "Room " + roomId;

        SharedPreferences prefs = getSharedPreferences("ayeraa_prefs", Context.MODE_PRIVATE);
        myId = prefs.getString("user_id", "");
        myName = prefs.getString("user_name", "Anonymous");
        myAvatar = prefs.getString("user_avatar", "⚡");
        token = prefs.getString("token", "");

        // Build 100% Native Layout (No WebView)
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#09090b"));

        // Header Toolbar
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setBackgroundColor(Color.parseColor("#18181b"));
        header.setPadding(24, 32, 24, 24);
        header.setGravity(Gravity.CENTER_VERTICAL);

        Button btnBack = new Button(this);
        btnBack.setText("←");
        btnBack.setTextSize(18);
        btnBack.setTextColor(Color.WHITE);
        btnBack.setBackgroundColor(Color.TRANSPARENT);
        btnBack.setOnClickListener(v -> finish());
        header.addView(btnBack);

        LinearLayout titleBox = new LinearLayout(this);
        titleBox.setOrientation(LinearLayout.VERTICAL);
        titleBox.setPadding(16, 0, 0, 0);

        tvRoomTitle = new TextView(this);
        tvRoomTitle.setText(roomName);
        tvRoomTitle.setTextSize(16);
        tvRoomTitle.setTextColor(Color.parseColor("#fafafa"));
        tvRoomTitle.setTypeface(null, android.graphics.Typeface.BOLD);
        titleBox.addView(tvRoomTitle);

        tvRoomSubtitle = new TextView(this);
        tvRoomSubtitle.setText("#" + roomId + " • Terhubung Realtime");
        tvRoomSubtitle.setTextSize(11);
        tvRoomSubtitle.setTextColor(Color.parseColor("#10b981"));
        titleBox.addView(tvRoomSubtitle);

        header.addView(titleBox, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f));
        root.addView(header);

        // Messages List View
        lvMessages = new ListView(this);
        lvMessages.setDivider(null);
        lvMessages.setPadding(16, 16, 16, 16);
        lvMessages.setClipToPadding(false);
        adapter = new MessageAdapter();
        lvMessages.setAdapter(adapter);
        root.addView(lvMessages, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f));

        // Bottom Input Bar
        LinearLayout inputBar = new LinearLayout(this);
        inputBar.setOrientation(LinearLayout.HORIZONTAL);
        inputBar.setBackgroundColor(Color.parseColor("#18181b"));
        inputBar.setPadding(16, 16, 16, 16);
        inputBar.setGravity(Gravity.CENTER_VERTICAL);

        etInput = new EditText(this);
        etInput.setHint("Ketik pesan...");
        etInput.setHintTextColor(Color.parseColor("#71717a"));
        etInput.setTextColor(Color.parseColor("#fafafa"));
        etInput.setBackgroundColor(Color.parseColor("#121215"));
        etInput.setTextSize(14);
        etInput.setPadding(20, 16, 20, 16);
        inputBar.addView(etInput, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f));

        btnSend = new Button(this);
        btnSend.setText("Kirim");
        btnSend.setTextSize(12);
        btnSend.setTextColor(Color.parseColor("#09090b"));
        btnSend.setBackgroundColor(Color.parseColor("#fafafa"));
        btnSend.setTypeface(null, android.graphics.Typeface.BOLD);
        btnSend.setOnClickListener(v -> handleSendMessage());
        inputBar.addView(btnSend);

        root.addView(inputBar);
        setContentView(root);

        // Join room & start polling
        joinAndInitRoom();
    }

    private void joinAndInitRoom() {
        ApiClient.joinRoom(roomId, myId, myName, myAvatar, new ApiClient.Callback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject res) {
                // Mark notifications as read if it's a DM
                if (roomId.startsWith("dm--")) {
                    ApiClient.markNotificationsRead(myId, roomId, token, new ApiClient.Callback<Boolean>() {
                        @Override public void onSuccess(Boolean result) {}
                        @Override public void onError(String error) {}
                    });
                }
                startPolling();
            }

            @Override
            public void onError(String error) {
                startPolling();
            }
        });
    }

    private boolean addOrUpdateMessage(JSONObject msg) {
        if (msg == null) return false;
        String id = msg.optString("id");
        long ts = msg.optLong("timestamp", 0);
        long updated = msg.optLong("updatedAt", ts);
        long effectiveTs = Math.max(ts, updated);
        if (effectiveTs > lastTimestamp) {
            lastTimestamp = effectiveTs;
        }

        if (!id.isEmpty()) {
            for (int i = 0; i < messageList.size(); i++) {
                JSONObject existing = messageList.get(i);
                if (id.equals(existing.optString("id"))) {
                    messageList.set(i, msg);
                    return true;
                }
            }
        }
        messageList.add(msg);
        return true;
    }

    private void startPolling() {
        isPolling = true;
        pollRunnable.run();
    }

    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isPolling) return;
            ApiClient.pollRoom(roomId, lastTimestamp, myId, myName, myAvatar, new ApiClient.Callback<JSONObject>() {
                @Override
                public void onSuccess(JSONObject res) {
                    JSONArray msgs = res.optJSONArray("messages");
                    boolean changed = false;
                    if (msgs != null && msgs.length() > 0) {
                        for (int i = 0; i < msgs.length(); i++) {
                            JSONObject m = msgs.optJSONObject(i);
                            if (addOrUpdateMessage(m)) {
                                changed = true;
                            }
                        }
                    }
                    if (changed) {
                        adapter.notifyDataSetChanged();
                        lvMessages.setSelection(messageList.size() - 1);
                    }

                    // Presence indicator
                    JSONArray parts = res.optJSONArray("participants");
                    int onlineCount = 0;
                    if (parts != null) {
                        for (int i = 0; i < parts.length(); i++) {
                            JSONObject p = parts.optJSONObject(i);
                            if (p != null && p.optBoolean("isOnline", false)) {
                                onlineCount++;
                            }
                        }
                    }
                    if (onlineCount > 0) {
                        tvRoomSubtitle.setText("#" + roomId + " • " + onlineCount + " online");
                    } else {
                        tvRoomSubtitle.setText("#" + roomId + " • Terhubung Realtime");
                    }

                    if (isPolling) pollHandler.postDelayed(pollRunnable, 1500);
                }

                @Override
                public void onError(String error) {
                    if (isPolling) pollHandler.postDelayed(pollRunnable, 2500);
                }
            });
        }
    };

    private void handleSendMessage() {
        String text = etInput.getText().toString().trim();
        if (text.isEmpty()) return;

        etInput.setText("");
        ApiClient.sendMessage(roomId, myId, myName, myAvatar, text, new ApiClient.Callback<JSONObject>() {
            @Override
            public void onSuccess(JSONObject res) {
                JSONObject msg = res.optJSONObject("message");
                if (msg != null) {
                    addOrUpdateMessage(msg);
                    adapter.notifyDataSetChanged();
                    lvMessages.setSelection(messageList.size() - 1);
                }
            }

            @Override
            public void onError(String error) {
                Toast.makeText(RoomActivity.this, "Gagal mengirim: " + error, Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        isPolling = false;
        pollHandler.removeCallbacks(pollRunnable);
    }

    // Native Message Adapter
    private class MessageAdapter extends BaseAdapter {
        private final SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());

        @Override
        public int getCount() {
            return messageList.size();
        }

        @Override
        public JSONObject getItem(int position) {
            return messageList.get(position);
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            JSONObject msg = getItem(position);
            boolean isMe = msg.optString("senderId", "").equals(myId);
            boolean isSystem = msg.optBoolean("isSystem", false);

            LinearLayout itemLayout = new LinearLayout(RoomActivity.this);
            itemLayout.setOrientation(LinearLayout.VERTICAL);
            itemLayout.setPadding(8, 6, 8, 6);

            if (isSystem) {
                TextView tvSys = new TextView(RoomActivity.this);
                tvSys.setText(msg.optString("content"));
                tvSys.setTextSize(11);
                tvSys.setTextColor(Color.parseColor("#71717a"));
                tvSys.setGravity(Gravity.CENTER);
                itemLayout.addView(tvSys);
                return itemLayout;
            }

            LinearLayout bubble = new LinearLayout(RoomActivity.this);
            bubble.setOrientation(LinearLayout.VERTICAL);
            bubble.setPadding(20, 14, 20, 14);

            LinearLayout.LayoutParams bubbleParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);

            if (isMe) {
                itemLayout.setGravity(Gravity.END);
                bubble.setBackgroundColor(Color.parseColor("#27272a"));
                bubbleParams.gravity = Gravity.END;
            } else {
                itemLayout.setGravity(Gravity.START);
                bubble.setBackgroundColor(Color.parseColor("#18181b"));
                bubbleParams.gravity = Gravity.START;

                TextView tvSender = new TextView(RoomActivity.this);
                tvSender.setText(msg.optString("senderAvatar") + " " + msg.optString("senderName"));
                tvSender.setTextSize(11);
                tvSender.setTextColor(Color.parseColor("#a1a1aa"));
                tvSender.setTypeface(null, android.graphics.Typeface.BOLD);
                bubble.addView(tvSender);
            }

            TextView tvText = new TextView(RoomActivity.this);
            tvText.setText(msg.optString("content"));
            tvText.setTextSize(14);
            tvText.setTextColor(Color.parseColor("#fafafa"));
            tvText.setPadding(0, 4, 0, 4);
            bubble.addView(tvText);

            long ts = msg.optLong("timestamp", 0);
            if (ts > 0) {
                TextView tvTime = new TextView(RoomActivity.this);
                tvTime.setText(timeFormat.format(new Date(ts)));
                tvTime.setTextSize(9);
                tvTime.setTextColor(Color.parseColor("#71717a"));
                tvTime.setGravity(Gravity.END);
                bubble.addView(tvTime);
            }

            itemLayout.addView(bubble, bubbleParams);
            return itemLayout;
        }
    }
}
