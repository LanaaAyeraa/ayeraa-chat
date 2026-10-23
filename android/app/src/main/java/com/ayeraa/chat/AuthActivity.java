package com.ayeraa.chat;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.ayeraa.chat.api.ApiClient;

import org.json.JSONObject;

public class AuthActivity extends Activity {
    private boolean isLoginMode = true;
    private String selectedAvatar = "⚡";

    private EditText etName;
    private EditText etUsername;
    private EditText etPassword;
    private Button btnSubmit;
    private Button tabLogin;
    private Button tabRegister;
    private LinearLayout avatarPickerLayout;
    private ProgressBar progressBar;
    private TextView tvError;

    private static final String[] AVATARS = {"⚡", "🦊", "🦉", "🌸", "☕", "🚀", "🐺", "🕯️", "💬", "🎨"};

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Check if already authenticated
        SharedPreferences prefs = getSharedPreferences("ayeraa_prefs", Context.MODE_PRIVATE);
        if (prefs.contains("token") && prefs.contains("user_id")) {
            startActivity(new Intent(this, MainActivity.class));
            finish();
            return;
        }

        // Build Native UI Programmatically (No WebView, 100% Native Android Views)
        ScrollView scrollView = new ScrollView(this);
        scrollView.setBackgroundColor(Color.parseColor("#09090b"));
        scrollView.setFillViewport(true);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(48, 64, 48, 64);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        scrollView.addView(root);

        // Header Title
        TextView tvBrand = new TextView(this);
        tvBrand.setText("Ayeraa Chat");
        tvBrand.setTextSize(26);
        tvBrand.setTextColor(Color.parseColor("#fafafa"));
        tvBrand.setTypeface(null, android.graphics.Typeface.BOLD);
        tvBrand.setGravity(Gravity.CENTER);
        root.addView(tvBrand);

        TextView tvSub = new TextView(this);
        tvSub.setText("Ruang Obrolan Realtime Terenkripsi");
        tvSub.setTextSize(13);
        tvSub.setTextColor(Color.parseColor("#a1a1aa"));
        tvSub.setGravity(Gravity.CENTER);
        tvSub.setPadding(0, 8, 0, 48);
        root.addView(tvSub);

        // Segmented Control (Login vs Register)
        LinearLayout tabLayout = new LinearLayout(this);
        tabLayout.setOrientation(LinearLayout.HORIZONTAL);
        tabLayout.setBackgroundColor(Color.parseColor("#18181b"));
        tabLayout.setPadding(8, 8, 8, 8);

        tabLogin = new Button(this);
        tabLogin.setText("Masuk");
        tabLogin.setTextSize(12);
        tabLogin.setTextColor(Color.WHITE);
        tabLogin.setBackgroundColor(Color.parseColor("#27272a"));
        LinearLayout.LayoutParams tabParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        tabLayout.addView(tabLogin, tabParams);

        tabRegister = new Button(this);
        tabRegister.setText("Daftar Akun");
        tabRegister.setTextSize(12);
        tabRegister.setTextColor(Color.parseColor("#a1a1aa"));
        tabRegister.setBackgroundColor(Color.TRANSPARENT);
        tabLayout.addView(tabRegister, tabParams);
        root.addView(tabLayout);

        // Card Container
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundColor(Color.parseColor("#18181b"));
        card.setPadding(32, 32, 32, 32);
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardParams.setMargins(0, 24, 0, 24);
        root.addView(card, cardParams);

        // Name input (visible only for register)
        etName = createEditText("Nama Tampilan (e.g. Budi Santoso)");
        etName.setVisibility(View.GONE);
        card.addView(etName);

        // Username input
        etUsername = createEditText("Username (huruf kecil & angka)");
        card.addView(etUsername);

        // Password input
        etPassword = createEditText("Password (min 6 karakter)");
        etPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        card.addView(etPassword);

        // Avatar selector (for register)
        avatarPickerLayout = new LinearLayout(this);
        avatarPickerLayout.setOrientation(LinearLayout.VERTICAL);
        avatarPickerLayout.setVisibility(View.GONE);
        avatarPickerLayout.setPadding(0, 16, 0, 16);

        TextView tvAvatarLabel = new TextView(this);
        tvAvatarLabel.setText("Pilih Avatar Anda:");
        tvAvatarLabel.setTextSize(12);
        tvAvatarLabel.setTextColor(Color.parseColor("#a1a1aa"));
        avatarPickerLayout.addView(tvAvatarLabel);

        LinearLayout emojiRow = new LinearLayout(this);
        emojiRow.setOrientation(LinearLayout.HORIZONTAL);
        emojiRow.setGravity(Gravity.CENTER);
        emojiRow.setPadding(0, 8, 0, 8);

        for (String av : AVATARS) {
            TextView btnAv = new TextView(this);
            btnAv.setText(av);
            btnAv.setTextSize(22);
            btnAv.setPadding(12, 12, 12, 12);
            btnAv.setOnClickListener(v -> {
                selectedAvatar = av;
                Toast.makeText(AuthActivity.this, "Avatar terpilih: " + av, Toast.LENGTH_SHORT).show();
            });
            emojiRow.addView(btnAv);
        }
        avatarPickerLayout.addView(emojiRow);
        card.addView(avatarPickerLayout);

        // Error message
        tvError = new TextView(this);
        tvError.setTextColor(Color.parseColor("#f43f5e"));
        tvError.setTextSize(12);
        tvError.setVisibility(View.GONE);
        tvError.setPadding(0, 8, 0, 8);
        card.addView(tvError);

        // Progress bar
        progressBar = new ProgressBar(this);
        progressBar.setVisibility(View.GONE);
        card.addView(progressBar);

        // Submit Button
        btnSubmit = new Button(this);
        btnSubmit.setText("Masuk ke Ayeraa");
        btnSubmit.setTextColor(Color.parseColor("#09090b"));
        btnSubmit.setBackgroundColor(Color.parseColor("#fafafa"));
        btnSubmit.setTypeface(null, android.graphics.Typeface.BOLD);
        btnSubmit.setPadding(0, 24, 0, 24);
        card.addView(btnSubmit);

        // Tab Toggle Handlers
        tabLogin.setOnClickListener(v -> setMode(true));
        tabRegister.setOnClickListener(v -> setMode(false));

        // Submit Handler
        btnSubmit.setOnClickListener(v -> handleSubmit());

        setContentView(scrollView);
    }

    private EditText createEditText(String hint) {
        EditText et = new EditText(this);
        et.setHint(hint);
        et.setHintTextColor(Color.parseColor("#52525b"));
        et.setTextColor(Color.parseColor("#fafafa"));
        et.setBackgroundColor(Color.parseColor("#121215"));
        et.setTextSize(14);
        et.setPadding(24, 24, 24, 24);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 16);
        et.setLayoutParams(lp);
        return et;
    }

    private void setMode(boolean login) {
        isLoginMode = login;
        tvError.setVisibility(View.GONE);
        if (login) {
            tabLogin.setBackgroundColor(Color.parseColor("#27272a"));
            tabLogin.setTextColor(Color.WHITE);
            tabRegister.setBackgroundColor(Color.TRANSPARENT);
            tabRegister.setTextColor(Color.parseColor("#a1a1aa"));
            etName.setVisibility(View.GONE);
            avatarPickerLayout.setVisibility(View.GONE);
            btnSubmit.setText("Masuk ke Ayeraa");
        } else {
            tabRegister.setBackgroundColor(Color.parseColor("#27272a"));
            tabRegister.setTextColor(Color.WHITE);
            tabLogin.setBackgroundColor(Color.TRANSPARENT);
            tabLogin.setTextColor(Color.parseColor("#a1a1aa"));
            etName.setVisibility(View.VISIBLE);
            avatarPickerLayout.setVisibility(View.VISIBLE);
            btnSubmit.setText("Daftar Akun Baru");
        }
    }

    private void handleSubmit() {
        String username = etUsername.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        if (username.isEmpty() || password.isEmpty()) {
            showError("Username dan password tidak boleh kosong");
            return;
        }

        setLoading(true);

        if (isLoginMode) {
            ApiClient.login(username, password, new ApiClient.Callback<JSONObject>() {
                @Override
                public void onSuccess(JSONObject res) {
                    setLoading(false);
                    handleAuthSuccess(res);
                }

                @Override
                public void onError(String error) {
                    setLoading(false);
                    showError(error);
                }
            });
        } else {
            String name = etName.getText().toString().trim();
            if (name.isEmpty()) name = username;

            ApiClient.register(name, username, password, selectedAvatar, new ApiClient.Callback<JSONObject>() {
                @Override
                public void onSuccess(JSONObject res) {
                    setLoading(false);
                    handleAuthSuccess(res);
                }

                @Override
                public void onError(String error) {
                    setLoading(false);
                    showError(error);
                }
            });
        }
    }

    private void handleAuthSuccess(JSONObject res) {
        try {
            String token = res.optString("token");
            JSONObject user = res.optJSONObject("user");
            if (user != null) {
                SharedPreferences prefs = getSharedPreferences("ayeraa_prefs", Context.MODE_PRIVATE);
                prefs.edit()
                        .putString("token", token)
                        .putString("user_id", user.optString("id"))
                        .putString("user_name", user.optString("name"))
                        .putString("user_username", user.optString("username"))
                        .putString("user_avatar", user.optString("avatar"))
                        .apply();

                Toast.makeText(this, "Selamat datang, " + user.optString("name") + "!", Toast.LENGTH_SHORT).show();
                startActivity(new Intent(this, MainActivity.class));
                finish();
            }
        } catch (Exception e) {
            showError("Gagal memproses data sesi");
        }
    }

    private void setLoading(boolean loading) {
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnSubmit.setEnabled(!loading);
        btnSubmit.setAlpha(loading ? 0.5f : 1.0f);
    }

    private void showError(String msg) {
        tvError.setText(msg);
        tvError.setVisibility(View.VISIBLE);
    }
}
