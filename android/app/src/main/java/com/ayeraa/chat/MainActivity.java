package com.ayeraa.chat;

import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ScrollView;
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

public class MainActivity extends Activity {
    private String myId;
    private String myName;
    private String myUsername;
    private String myAvatar;
    private String token;

    private int activeTab = 0; // 0: Pesan, 1: Room, 2: Cari, 3: Profil
    private FrameLayout container;
    private LinearLayout tabBottomBar;
    private TextView tvBrandStatus;
    private TextView tvPesanBadge;

    // Tab 0: Pesan (DMs)
    private LinearLayout layoutPesan;
    private ListView lvConversations;
    private ConversationAdapter conversationAdapter;
    private final List<JSONObject> conversationList = new ArrayList<>();
    private TextView tvEmptyConversations;

    // Tab 1: Room Publik
    private LinearLayout layoutRooms;
    private ListView lvRooms;
    private RoomAdapter roomAdapter;
    private final List<JSONObject> roomList = new ArrayList<>();

    // Tab 2: Cari Teman
    private LinearLayout layoutSearch;
    private EditText etSearch;
    private ListView lvSearchResults;
    private UserAdapter userAdapter;
    private final List<JSONObject> searchResults = new ArrayList<>();
    private TextView tvEmptySearch;

    // Tab 3: Profil
    private ScrollView layoutProfile;

    // Polling & Notification
    private final Handler pollHandler = new Handler(Looper.getMainLooper());
    private boolean isPolling = false;
    private static final String NOTIF_CHANNEL_ID = "ayeraa_dm_notifications";
    private int lastUnreadCount = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences prefs = getSharedPreferences("ayeraa_prefs", Context.MODE_PRIVATE);
        myId = prefs.getString("user_id", null);
        myName = prefs.getString("user_name", "Anonymous");
        myUsername = prefs.getString("user_username", "");
        myAvatar = prefs.getString("user_avatar", "⚡");
        token = prefs.getString("token", null);

        if (myId == null || token == null) {
            startActivity(new Intent(this, AuthActivity.class));
            finish();
            return;
        }

        initNotificationChannel();

        // 100% Native Layout (Zero WebView)
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#09090b"));

        // Top App Bar
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setBackgroundColor(Color.parseColor("#18181b"));
        topBar.setPadding(32, 28, 32, 28);
        topBar.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout topInfo = new LinearLayout(this);
        topInfo.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams infoParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);

        TextView tvTitle = new TextView(this);
        tvTitle.setText("Ayeraa Chat");
        tvTitle.setTextSize(20);
        tvTitle.setTextColor(Color.parseColor("#fafafa"));
        tvTitle.setTypeface(null, Typeface.BOLD);
        topInfo.addView(tvTitle);

        tvBrandStatus = new TextView(this);
        tvBrandStatus.setText("● Terhubung sebagai @" + myUsername);
        tvBrandStatus.setTextSize(11);
        tvBrandStatus.setTextColor(Color.parseColor("#10b981"));
        topInfo.addView(tvBrandStatus);

        topBar.addView(topInfo, infoParams);

        TextView tvAvatarBadge = new TextView(this);
        tvAvatarBadge.setText(myAvatar);
        tvAvatarBadge.setTextSize(24);
        tvAvatarBadge.setPadding(16, 8, 16, 8);
        tvAvatarBadge.setBackgroundColor(Color.parseColor("#27272a"));
        topBar.addView(tvAvatarBadge);

        root.addView(topBar);

        // Content Area (FrameLayout with 4 views)
        container = new FrameLayout(this);
        LinearLayout.LayoutParams containerParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f);
        root.addView(container, containerParams);

        // Build 4 Views
        initTabPesan();
        initTabRooms();
        initTabSearch();
        initTabProfile();

        // Bottom Navigation Bar
        buildBottomNav(root);

        setContentView(root);

        // Switch to default Tab (Pesan)
        switchTab(0);
    }

    private void initNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Pemberitahuan Pesan";
            String description = "Notifikasi obrolan langsung dan room";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(NOTIF_CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    // -------------------------------------------------------------
    // Tab 0: Pesan (Direct Message Inbox ala WA / IG)
    // -------------------------------------------------------------
    private void initTabPesan() {
        layoutPesan = new LinearLayout(this);
        layoutPesan.setOrientation(LinearLayout.VERTICAL);
        layoutPesan.setPadding(24, 20, 24, 16);

        TextView tvHeader = new TextView(this);
        tvHeader.setText("Obrolan Langsung (DM)");
        tvHeader.setTextSize(17);
        tvHeader.setTextColor(Color.parseColor("#fafafa"));
        tvHeader.setTypeface(null, Typeface.BOLD);
        tvHeader.setPadding(8, 8, 8, 16);
        layoutPesan.addView(tvHeader);

        tvEmptyConversations = new TextView(this);
        tvEmptyConversations.setText("Belum ada pesan masuk.\nCari teman di tab Cari Teman untuk memulai DM!");
        tvEmptyConversations.setTextSize(13);
        tvEmptyConversations.setTextColor(Color.parseColor("#71717a"));
        tvEmptyConversations.setGravity(Gravity.CENTER);
        tvEmptyConversations.setPadding(32, 100, 32, 100);
        layoutPesan.addView(tvEmptyConversations);

        lvConversations = new ListView(this);
        lvConversations.setDivider(null);
        lvConversations.setDividerHeight(12);
        conversationAdapter = new ConversationAdapter();
        lvConversations.setAdapter(conversationAdapter);
        layoutPesan.addView(lvConversations, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));

        lvConversations.setOnItemClickListener((parent, view, position, id) -> {
            JSONObject conv = conversationList.get(position);
            String roomId = conv.optString("id");
            JSONObject peer = conv.optJSONObject("peer");
            String peerName = peer != null ? peer.optString("name", "Obrolan") : "Obrolan";

            Intent intent = new Intent(this, RoomActivity.class);
            intent.putExtra("room_id", roomId);
            intent.putExtra("room_name", peerName);
            startActivity(intent);
        });

        container.addView(layoutPesan);
    }

    // -------------------------------------------------------------
    // Tab 1: Room Publik
    // -------------------------------------------------------------
    private void initTabRooms() {
        layoutRooms = new LinearLayout(this);
        layoutRooms.setOrientation(LinearLayout.VERTICAL);
        layoutRooms.setPadding(24, 20, 24, 16);

        TextView tvHeader = new TextView(this);
        tvHeader.setText("Ruang Obrolan Publik");
        tvHeader.setTextSize(17);
        tvHeader.setTextColor(Color.parseColor("#fafafa"));
        tvHeader.setTypeface(null, Typeface.BOLD);
        tvHeader.setPadding(8, 8, 8, 16);
        layoutRooms.addView(tvHeader);

        lvRooms = new ListView(this);
        lvRooms.setDivider(null);
        lvRooms.setDividerHeight(12);
        roomAdapter = new RoomAdapter();
        lvRooms.setAdapter(roomAdapter);
        layoutRooms.addView(lvRooms, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));

        lvRooms.setOnItemClickListener((parent, view, position, id) -> {
            JSONObject room = roomList.get(position);
            String roomId = room.optString("id");
            String roomName = room.optString("name");

            Intent intent = new Intent(this, RoomActivity.class);
            intent.putExtra("room_id", roomId);
            intent.putExtra("room_name", roomName);
            startActivity(intent);
        });

        container.addView(layoutRooms);
    }

    // -------------------------------------------------------------
    // Tab 2: Cari Teman (User Search)
    // -------------------------------------------------------------
    private void initTabSearch() {
        layoutSearch = new LinearLayout(this);
        layoutSearch.setOrientation(LinearLayout.VERTICAL);
        layoutSearch.setPadding(24, 20, 24, 16);

        TextView tvHeader = new TextView(this);
        tvHeader.setText("Temukan Pengguna");
        tvHeader.setTextSize(17);
        tvHeader.setTextColor(Color.parseColor("#fafafa"));
        tvHeader.setTypeface(null, Typeface.BOLD);
        tvHeader.setPadding(8, 8, 8, 16);
        layoutSearch.addView(tvHeader);

        // Search Input Bar
        LinearLayout searchBar = new LinearLayout(this);
        searchBar.setOrientation(LinearLayout.HORIZONTAL);
        searchBar.setBackgroundColor(Color.parseColor("#18181b"));
        searchBar.setPadding(16, 8, 16, 8);
        searchBar.setGravity(Gravity.CENTER_VERTICAL);

        etSearch = new EditText(this);
        etSearch.setHint("Ketik nama atau @username...");
        etSearch.setHintTextColor(Color.parseColor("#71717a"));
        etSearch.setTextColor(Color.parseColor("#fafafa"));
        etSearch.setTextSize(14);
        etSearch.setBackgroundColor(Color.TRANSPARENT);
        etSearch.setPadding(16, 16, 16, 16);
        LinearLayout.LayoutParams etParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        searchBar.addView(etSearch, etParams);

        Button btnDoSearch = new Button(this);
        btnDoSearch.setText("Cari");
        btnDoSearch.setTextColor(Color.WHITE);
        btnDoSearch.setBackgroundColor(Color.parseColor("#6366f1"));
        btnDoSearch.setTextSize(12);
        btnDoSearch.setOnClickListener(v -> doUserSearch());
        searchBar.addView(btnDoSearch);

        layoutSearch.addView(searchBar);

        tvEmptySearch = new TextView(this);
        tvEmptySearch.setText("Ketik nama pengguna untuk mulai mencari teman.");
        tvEmptySearch.setTextSize(13);
        tvEmptySearch.setTextColor(Color.parseColor("#71717a"));
        tvEmptySearch.setGravity(Gravity.CENTER);
        tvEmptySearch.setPadding(32, 80, 32, 80);
        layoutSearch.addView(tvEmptySearch);

        lvSearchResults = new ListView(this);
        lvSearchResults.setDivider(null);
        lvSearchResults.setDividerHeight(12);
        userAdapter = new UserAdapter();
        lvSearchResults.setAdapter(userAdapter);
        layoutSearch.addView(lvSearchResults, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));

        container.addView(layoutSearch);
    }

    // -------------------------------------------------------------
    // Tab 3: Profil
    // -------------------------------------------------------------
    private void initTabProfile() {
        layoutProfile = new ScrollView(this);
        layoutProfile.setFillViewport(true);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(32, 48, 32, 48);
        content.setGravity(Gravity.CENTER_HORIZONTAL);
        layoutProfile.addView(content);

        TextView tvAvatarLarge = new TextView(this);
        tvAvatarLarge.setText(myAvatar);
        tvAvatarLarge.setTextSize(64);
        tvAvatarLarge.setGravity(Gravity.CENTER);
        tvAvatarLarge.setPadding(0, 0, 0, 24);
        content.addView(tvAvatarLarge);

        TextView tvNameLarge = new TextView(this);
        tvNameLarge.setText(myName);
        tvNameLarge.setTextSize(22);
        tvNameLarge.setTextColor(Color.parseColor("#fafafa"));
        tvNameLarge.setTypeface(null, Typeface.BOLD);
        tvNameLarge.setGravity(Gravity.CENTER);
        content.addView(tvNameLarge);

        TextView tvUsernameDisplay = new TextView(this);
        tvUsernameDisplay.setText("@" + myUsername);
        tvUsernameDisplay.setTextSize(14);
        tvUsernameDisplay.setTextColor(Color.parseColor("#a1a1aa"));
        tvUsernameDisplay.setGravity(Gravity.CENTER);
        tvUsernameDisplay.setPadding(0, 4, 0, 32);
        content.addView(tvUsernameDisplay);

        // Info Card
        LinearLayout infoCard = new LinearLayout(this);
        infoCard.setOrientation(LinearLayout.VERTICAL);
        infoCard.setBackgroundColor(Color.parseColor("#18181b"));
        infoCard.setPadding(24, 24, 24, 24);

        TextView tvCardTitle = new TextView(this);
        tvCardTitle.setText("Informasi Akun");
        tvCardTitle.setTextColor(Color.parseColor("#fafafa"));
        tvCardTitle.setTypeface(null, Typeface.BOLD);
        tvCardTitle.setTextSize(14);
        infoCard.addView(tvCardTitle);

        TextView tvCardServer = new TextView(this);
        tvCardServer.setText("Server: haven-chat-eight.vercel.app\nStatus: Aktif & Terhubung\nProtokol: Native Android HTTP/REST");
        tvCardServer.setTextColor(Color.parseColor("#a1a1aa"));
        tvCardServer.setTextSize(12);
        tvCardServer.setPadding(0, 12, 0, 0);
        infoCard.addView(tvCardServer);

        content.addView(infoCard, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        // Logout Button
        Button btnLogout = new Button(this);
        btnLogout.setText("Keluar Akun (Logout)");
        btnLogout.setTextColor(Color.parseColor("#f43f5e"));
        btnLogout.setBackgroundColor(Color.parseColor("#27272a"));
        btnLogout.setTextSize(14);
        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        btnParams.setMargins(0, 48, 0, 0);
        btnLogout.setOnClickListener(v -> doLogout());
        content.addView(btnLogout, btnParams);

        container.addView(layoutProfile);
    }

    // -------------------------------------------------------------
    // Bottom Navigation Bar
    // -------------------------------------------------------------
    private Button btnTab0, btnTab1, btnTab2, btnTab3;

    private void buildBottomNav(LinearLayout root) {
        tabBottomBar = new LinearLayout(this);
        tabBottomBar.setOrientation(LinearLayout.HORIZONTAL);
        tabBottomBar.setBackgroundColor(Color.parseColor("#18181b"));
        tabBottomBar.setPadding(12, 16, 12, 16);

        LinearLayout.LayoutParams tabParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);

        btnTab0 = createNavButton("💬 Pesan", 0);
        btnTab1 = createNavButton("🌐 Room", 1);
        btnTab2 = createNavButton("🔍 Teman", 2);
        btnTab3 = createNavButton("👤 Profil", 3);

        tabBottomBar.addView(btnTab0, tabParams);
        tabBottomBar.addView(btnTab1, tabParams);
        tabBottomBar.addView(btnTab2, tabParams);
        tabBottomBar.addView(btnTab3, tabParams);

        root.addView(tabBottomBar);
    }

    private Button createNavButton(String label, int index) {
        Button btn = new Button(this);
        btn.setText(label);
        btn.setTextSize(11);
        btn.setTextColor(Color.parseColor("#71717a"));
        btn.setBackgroundColor(Color.TRANSPARENT);
        btn.setOnClickListener(v -> switchTab(index));
        return btn;
    }

    private void switchTab(int tabIndex) {
        activeTab = tabIndex;
        layoutPesan.setVisibility(tabIndex == 0 ? View.VISIBLE : View.GONE);
        layoutRooms.setVisibility(tabIndex == 1 ? View.VISIBLE : View.GONE);
        layoutSearch.setVisibility(tabIndex == 2 ? View.VISIBLE : View.GONE);
        layoutProfile.setVisibility(tabIndex == 3 ? View.VISIBLE : View.GONE);

        btnTab0.setTextColor(tabIndex == 0 ? Color.parseColor("#6366f1") : Color.parseColor("#71717a"));
        btnTab1.setTextColor(tabIndex == 1 ? Color.parseColor("#6366f1") : Color.parseColor("#71717a"));
        btnTab2.setTextColor(tabIndex == 2 ? Color.parseColor("#6366f1") : Color.parseColor("#71717a"));
        btnTab3.setTextColor(tabIndex == 3 ? Color.parseColor("#6366f1") : Color.parseColor("#71717a"));

        if (tabIndex == 0) loadConversations();
        if (tabIndex == 1) loadPublicRooms();
    }

    // -------------------------------------------------------------
    // Data Loading & API Calls
    // -------------------------------------------------------------
    private void loadConversations() {
        ApiClient.getConversations(myId, token, new ApiClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray arr) {
                conversationList.clear();
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.optJSONObject(i);
                    if (obj != null) conversationList.add(obj);
                }
                tvEmptyConversations.setVisibility(conversationList.isEmpty() ? View.VISIBLE : View.GONE);
                conversationAdapter.notifyDataSetChanged();
            }

            @Override
            public void onError(String error) {
                // silently keep existing
            }
        });
    }

    private void loadPublicRooms() {
        if (!roomList.isEmpty()) return; // loaded
        ApiClient.getPublicRooms(new ApiClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray arr) {
                roomList.clear();
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.optJSONObject(i);
                    if (obj != null) roomList.add(obj);
                }
                if (roomList.isEmpty()) {
                    // Fallback default rooms
                    addDefaultRoom("general", "Lobby Utama", "Ruang kumpul umum seluruh pengguna");
                    addDefaultRoom("santai", "Santai & Kopi", "Obrolan santai, curhat dan ngopi sore");
                    addDefaultRoom("teknologi", "Teknologi & AI", "Diskusi coding, AI, gadget & startup");
                    addDefaultRoom("gaming", "Gaming & Musik", "Mabar game, lagu santai & playlist");
                }
                roomAdapter.notifyDataSetChanged();
            }

            @Override
            public void onError(String error) {
                if (roomList.isEmpty()) {
                    addDefaultRoom("general", "Lobby Utama", "Ruang kumpul umum seluruh pengguna");
                    addDefaultRoom("santai", "Santai & Kopi", "Obrolan santai, curhat dan ngopi sore");
                    addDefaultRoom("teknologi", "Teknologi & AI", "Diskusi coding, AI, gadget & startup");
                    addDefaultRoom("gaming", "Gaming & Musik", "Mabar game, lagu santai & playlist");
                    roomAdapter.notifyDataSetChanged();
                }
            }
        });
    }

    private void addDefaultRoom(String id, String name, String desc) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("id", id);
            obj.put("name", name);
            obj.put("description", desc);
            roomList.add(obj);
        } catch (Exception ignored) {}
    }

    private void doUserSearch() {
        String q = etSearch.getText().toString().trim();
        if (TextUtils.isEmpty(q)) return;

        ApiClient.searchUsers(q, token, new ApiClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray arr) {
                searchResults.clear();
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject u = arr.optJSONObject(i);
                    if (u != null && !myId.equals(u.optString("id"))) {
                        searchResults.add(u);
                    }
                }
                tvEmptySearch.setVisibility(searchResults.isEmpty() ? View.VISIBLE : View.GONE);
                if (searchResults.isEmpty()) {
                    tvEmptySearch.setText("Pengguna tidak ditemukan untuk '" + q + "'.");
                }
                userAdapter.notifyDataSetChanged();
            }

            @Override
            public void onError(String error) {
                Toast.makeText(MainActivity.this, "Gagal mencari: " + error, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void startDirectMessageWith(JSONObject targetUser) {
        String peerId = targetUser.optString("id");
        String peerName = targetUser.optString("name", "Teman");
        String dmRoomId = getDmRoomId(myId, peerId);

        Intent intent = new Intent(this, RoomActivity.class);
        intent.putExtra("room_id", dmRoomId);
        intent.putExtra("room_name", peerName);
        startActivity(intent);
    }

    public static String getDmRoomId(String a, String b) {
        if (a.compareToIgnoreCase(b) < 0) {
            return ("dm--" + a + "--" + b).toLowerCase();
        } else {
            return ("dm--" + b + "--" + a).toLowerCase();
        }
    }

    private void doLogout() {
        SharedPreferences prefs = getSharedPreferences("ayeraa_prefs", Context.MODE_PRIVATE);
        prefs.edit().clear().apply();
        stopPolling();
        startActivity(new Intent(this, AuthActivity.class));
        finish();
    }

    // -------------------------------------------------------------
    // Lifecycle & Polling
    // -------------------------------------------------------------
    @Override
    protected void onResume() {
        super.onResume();
        startPolling();
        loadConversations();
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopPolling();
    }

    private void startPolling() {
        if (isPolling) return;
        isPolling = true;
        pollRunnable.run();
    }

    private void stopPolling() {
        isPolling = false;
        pollHandler.removeCallbacks(pollRunnable);
    }

    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isPolling) return;

            ApiClient.getNotifications(myId, token, new ApiClient.Callback<JSONArray>() {
                @Override
                public void onSuccess(JSONArray arr) {
                    int unread = arr.length();
                    if (unread > lastUnreadCount && unread > 0) {
                        try {
                            JSONObject latest = arr.getJSONObject(arr.length() - 1);
                            String sender = latest.optString("senderName", "Seseorang");
                            String snippet = latest.optString("snippet", "Mengirim pesan baru");
                            showSystemNotification(sender, snippet);
                        } catch (Exception ignored) {}
                    }
                    lastUnreadCount = unread;
                    btnTab0.setText(unread > 0 ? "💬 Pesan (" + unread + ")" : "💬 Pesan");

                    if (activeTab == 0) {
                        loadConversations();
                    }
                }

                @Override
                public void onError(String error) {
                    // silently ignore
                }
            });

            pollHandler.postDelayed(this, 4000);
        }
    };

    private void showSystemNotification(String sender, String text) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            Intent intent = new Intent(this, MainActivity.class);
            PendingIntent pi = PendingIntent.getActivity(this, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0));

            android.app.Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new android.app.Notification.Builder(this, NOTIF_CHANNEL_ID);
            } else {
                builder = new android.app.Notification.Builder(this);
            }

            builder.setContentTitle("DM dari " + sender)
                    .setContentText(text)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentIntent(pi)
                    .setAutoCancel(true);

            nm.notify(1001, builder.build());
        } catch (Exception ignored) {}
    }

    // -------------------------------------------------------------
    // List Adapters
    // -------------------------------------------------------------
    private class ConversationAdapter extends BaseAdapter {
        @Override
        public int getCount() { return conversationList.size(); }
        @Override
        public Object getItem(int pos) { return conversationList.get(pos); }
        @Override
        public long getItemId(int pos) { return pos; }

        @Override
        public View getView(int pos, View convertView, ViewGroup parent) {
            LinearLayout row;
            if (convertView == null) {
                row = new LinearLayout(MainActivity.this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                row.setBackgroundColor(Color.parseColor("#18181b"));
                row.setPadding(24, 20, 24, 20);
                row.setGravity(Gravity.CENTER_VERTICAL);
            } else {
                row = (LinearLayout) convertView;
                row.removeAllViews();
            }

            JSONObject conv = conversationList.get(pos);
            JSONObject peer = conv.optJSONObject("peer");
            String peerName = peer != null ? peer.optString("name", "Pengguna") : "Pengguna";
            String peerAvatar = peer != null ? peer.optString("avatar", "⚡") : "⚡";
            boolean isOnline = peer != null && peer.optBoolean("is_online", false);
            String lastMsg = conv.optString("last_message", "Belum ada pesan");
            int unread = conv.optInt("unread_count", 0);

            // Avatar Container with Online Indicator
            FrameLayout avatarFrame = new FrameLayout(MainActivity.this);
            TextView tvAvatar = new TextView(MainActivity.this);
            tvAvatar.setText(peerAvatar);
            tvAvatar.setTextSize(24);
            tvAvatar.setPadding(12, 8, 12, 8);
            tvAvatar.setBackgroundColor(Color.parseColor("#27272a"));
            avatarFrame.addView(tvAvatar);

            if (isOnline) {
                TextView dot = new TextView(MainActivity.this);
                dot.setText("●");
                dot.setTextColor(Color.parseColor("#10b981"));
                dot.setTextSize(10);
                FrameLayout.LayoutParams dotParams = new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT);
                dotParams.gravity = Gravity.BOTTOM | Gravity.END;
                avatarFrame.addView(dot, dotParams);
            }
            row.addView(avatarFrame);

            // Texts
            LinearLayout textLayout = new LinearLayout(MainActivity.this);
            textLayout.setOrientation(LinearLayout.VERTICAL);
            textLayout.setPadding(20, 0, 16, 0);
            LinearLayout.LayoutParams tParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);

            TextView tvName = new TextView(MainActivity.this);
            tvName.setText(peerName);
            tvName.setTextColor(Color.parseColor("#fafafa"));
            tvName.setTextSize(15);
            tvName.setTypeface(null, Typeface.BOLD);
            textLayout.addView(tvName);

            TextView tvSnippet = new TextView(MainActivity.this);
            tvSnippet.setText(lastMsg);
            tvSnippet.setTextColor(Color.parseColor("#a1a1aa"));
            tvSnippet.setTextSize(12);
            tvSnippet.setMaxLines(1);
            tvSnippet.setEllipsize(TextUtils.TruncateAt.END);
            textLayout.addView(tvSnippet);

            row.addView(textLayout, tParams);

            // Unread Badge
            if (unread > 0) {
                TextView tvBadge = new TextView(MainActivity.this);
                tvBadge.setText(String.valueOf(unread));
                tvBadge.setTextSize(11);
                tvBadge.setTextColor(Color.WHITE);
                tvBadge.setBackgroundColor(Color.parseColor("#6366f1"));
                tvBadge.setPadding(16, 6, 16, 6);
                row.addView(tvBadge);
            }

            return row;
        }
    }

    private class RoomAdapter extends BaseAdapter {
        @Override
        public int getCount() { return roomList.size(); }
        @Override
        public Object getItem(int pos) { return roomList.get(pos); }
        @Override
        public long getItemId(int pos) { return pos; }

        @Override
        public View getView(int pos, View convertView, ViewGroup parent) {
            LinearLayout row;
            if (convertView == null) {
                row = new LinearLayout(MainActivity.this);
                row.setOrientation(LinearLayout.VERTICAL);
                row.setBackgroundColor(Color.parseColor("#18181b"));
                row.setPadding(24, 20, 24, 20);
            } else {
                row = (LinearLayout) convertView;
                row.removeAllViews();
            }

            JSONObject room = roomList.get(pos);
            String name = room.optString("name", "Room");
            String desc = room.optString("description", "");

            TextView tvName = new TextView(MainActivity.this);
            tvName.setText("# " + name);
            tvName.setTextColor(Color.parseColor("#fafafa"));
            tvName.setTextSize(15);
            tvName.setTypeface(null, Typeface.BOLD);
            row.addView(tvName);

            if (!TextUtils.isEmpty(desc)) {
                TextView tvDesc = new TextView(MainActivity.this);
                tvDesc.setText(desc);
                tvDesc.setTextColor(Color.parseColor("#71717a"));
                tvDesc.setTextSize(12);
                tvDesc.setPadding(0, 4, 0, 0);
                row.addView(tvDesc);
            }

            return row;
        }
    }

    private class UserAdapter extends BaseAdapter {
        @Override
        public int getCount() { return searchResults.size(); }
        @Override
        public Object getItem(int pos) { return searchResults.get(pos); }
        @Override
        public long getItemId(int pos) { return pos; }

        @Override
        public View getView(int pos, View convertView, ViewGroup parent) {
            LinearLayout row;
            if (convertView == null) {
                row = new LinearLayout(MainActivity.this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                row.setBackgroundColor(Color.parseColor("#18181b"));
                row.setPadding(24, 16, 24, 16);
                row.setGravity(Gravity.CENTER_VERTICAL);
            } else {
                row = (LinearLayout) convertView;
                row.removeAllViews();
            }

            JSONObject user = searchResults.get(pos);
            String name = user.optString("name", "Pengguna");
            String username = user.optString("username", "");
            String avatar = user.optString("avatar", "⚡");
            boolean isOnline = user.optBoolean("is_online", false);

            TextView tvAvatar = new TextView(MainActivity.this);
            tvAvatar.setText(avatar);
            tvAvatar.setTextSize(24);
            tvAvatar.setPadding(12, 8, 12, 8);
            tvAvatar.setBackgroundColor(Color.parseColor("#27272a"));
            row.addView(tvAvatar);

            LinearLayout textLayout = new LinearLayout(MainActivity.this);
            textLayout.setOrientation(LinearLayout.VERTICAL);
            textLayout.setPadding(20, 0, 16, 0);
            LinearLayout.LayoutParams tParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);

            TextView tvName = new TextView(MainActivity.this);
            tvName.setText(name + (isOnline ? " 🟢" : ""));
            tvName.setTextColor(Color.parseColor("#fafafa"));
            tvName.setTextSize(14);
            tvName.setTypeface(null, Typeface.BOLD);
            textLayout.addView(tvName);

            TextView tvUser = new TextView(MainActivity.this);
            tvUser.setText("@" + username);
            tvUser.setTextColor(Color.parseColor("#71717a"));
            tvUser.setTextSize(12);
            textLayout.addView(tvUser);

            row.addView(textLayout, tParams);

            Button btnDm = new Button(MainActivity.this);
            btnDm.setText("Kirim DM");
            btnDm.setTextColor(Color.WHITE);
            btnDm.setBackgroundColor(Color.parseColor("#6366f1"));
            btnDm.setTextSize(11);
            btnDm.setOnClickListener(v -> startDirectMessageWith(user));
            row.addView(btnDm);

            return row;
        }
    }
}
