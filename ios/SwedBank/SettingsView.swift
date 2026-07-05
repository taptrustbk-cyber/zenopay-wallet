//
//  SettingsView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct SettingsView: View {
    let navigate: (AppRoute) -> Void
    @State private var biometricEnabled = true
    @State private var notificationsEnabled = true

    private let user = BankModel.shared.user

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                profileCard
                securitySection
                legalSection
                supportSection
                logoutButton
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var profileCard: some View {
        HStack(spacing: 14) {
            Circle()
                .fill(AppTheme.navy)
                .frame(width: 56, height: 56)
                .overlay {
                    Text(user.fullName.prefix(1))
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)
                }

            VStack(alignment: .leading, spacing: 3) {
                Text(user.fullName)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text(user.email)
                    .font(.system(size: 13))
                    .foregroundStyle(AppTheme.textSecondary)
                Text(user.phone)
                    .font(.system(size: 13))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            Spacer()
        }
        .padding(16)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.cardCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.1), radius: 8, y: 4)
    }

    private var securitySection: some View {
        settingsSection(title: "Security") {
            toggleRow(icon: "faceid", label: "Biometric Login", value: $biometricEnabled)
            toggleRow(icon: "bell.fill", label: "Push Notifications", value: $notificationsEnabled)
            linkRow(icon: "person.circle", label: "Profile") { navigate(.profile) }
        }
    }

    private var legalSection: some View {
        settingsSection(title: "Legal") {
            linkRow(icon: "doc.text.fill", label: "Privacy Policy") { navigate(.privacyPolicy) }
            linkRow(icon: "doc.plaintext.fill", label: "Terms & Conditions") { navigate(.termsConditions) }
            linkRow(icon: "list.bullet.rectangle", label: "Statements") { navigate(.statements) }
        }
    }

    private var supportSection: some View {
        settingsSection(title: "Support") {
            linkRow(icon: "questionmark.circle", label: "Help Center") { navigate(.support) }
            linkRow(icon: "envelope.fill", label: "Contact Support") { navigate(.support) }
        }
    }

    private func settingsSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                content()
            }
            .background(.white)
            .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
            .shadow(color: AppTheme.shadowColor.opacity(0.1), radius: 8, y: 4)
        }
    }

    private func toggleRow(icon: String, label: String, value: Binding<Bool>) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(AppTheme.navy)
                .frame(width: 32)
            Text(label)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(AppTheme.textPrimary)
            Spacer()
            Toggle("", isOn: value)
                .labelsHidden()
                .tint(AppTheme.navy)
        }
        .padding(14)
    }

    private func linkRow(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundStyle(AppTheme.navy)
                    .frame(width: 32)
                Text(label)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(AppTheme.textPrimary)
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(AppTheme.textMuted)
            }
            .padding(14)
        }
        .buttonStyle(.plain)
    }

    private var logoutButton: some View {
        Button {} label: {
            HStack {
                Image(systemName: "arrow.right.square.fill")
                Text("Sign Out")
            }
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(AppTheme.danger)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(AppTheme.danger.opacity(0.08))
            .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
        }
        .buttonStyle(.plain)
    }
}
