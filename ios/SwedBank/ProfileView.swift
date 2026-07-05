//
//  ProfileView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct ProfileView: View {
    private let user = BankModel.shared.user

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                avatarSection
                personalInfo
                accountInfo
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var avatarSection: some View {
        VStack(spacing: 10) {
            Circle()
                .fill(AppTheme.navy)
                .frame(width: 90, height: 90)
                .overlay {
                    Text(user.fullName.prefix(1))
                        .font(.system(size: 38, weight: .bold))
                        .foregroundStyle(.white)
                }
                .shadow(color: AppTheme.navy.opacity(0.25), radius: 12, y: 6)

            Text(user.fullName)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(AppTheme.textPrimary)
            Text(user.email)
                .font(.system(size: 14))
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.cardCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.1), radius: 8, y: 4)
    }

    private var personalInfo: some View {
        infoSection(title: "Personal Information") {
            infoRow(label: "Full Name", value: user.fullName)
            infoRow(label: "Email", value: user.email)
            infoRow(label: "Phone", value: user.phone)
            infoRow(label: "Address", value: user.address)
        }
    }

    private var accountInfo: some View {
        infoSection(title: "Bank Account") {
            infoRow(label: "Account Number", value: user.accountNumber)
            infoRow(label: "Clearing Number", value: user.clearingNumber)
            infoRow(label: "IBAN", value: SEKFormatter.iban(user.iban))
            infoRow(label: "BIC / SWIFT", value: user.bic)
        }
    }

    private func infoSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                content()
            }
            .background(.white)
            .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
            .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
        }
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(AppTheme.textPrimary)
                .multilineTextAlignment(.trailing)
        }
        .padding(14)
    }
}
