//
//  SendMoneyView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct SendMoneyView: View {
    @State private var recipientIBAN = ""
    @State private var recipientName = ""
    @State private var amount = ""
    @State private var note = ""
    @State private var showSuccess = false

    private let user = BankModel.shared.user
    private let fee = 0.0
    private var total: Double { Double(amount.replacingOccurrences(of: " ", with: "")) ?? 0 }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                balanceHeader
                recipientCard
                amountCard
                summaryCard
                sendButton
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("Send Money")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Transfer Sent", isPresented: $showSuccess) {
            Button("OK", role: .cancel) {
                recipientIBAN = ""
                recipientName = ""
                amount = ""
                note = ""
            }
        } message: {
            Text("Your transfer of \(SEKFormatter.currency(total)) has been submitted.")
        }
    }

    private var balanceHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Available Balance")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
            Text(SEKFormatter.currency(BankModel.shared.balance))
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(AppTheme.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.cardCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.1), radius: 8, y: 4)
    }

    private var recipientCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recipient")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)

            field(label: "Recipient Name", placeholder: "Full name", text: $recipientName)
            field(label: "IBAN", placeholder: "SE## #### #### #### #### ####", text: $recipientIBAN, monospaced: true)
        }
        .padding(16)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
    }

    private var amountCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Amount")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)

            HStack {
                TextField("0", text: $amount)
                    .keyboardType(.numberPad)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(AppTheme.textPrimary)
                Text("kr")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .padding(16)
            .background(AppTheme.surfaceSecondary)
            .clipShape(.rect(cornerRadius: 14))

            field(label: "Note (optional)", placeholder: "Write a note", text: $note)
        }
        .padding(16)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
    }

    private var summaryCard: some View {
        VStack(spacing: 10) {
            row(label: "Amount", value: SEKFormatter.currency(total))
            row(label: "Fee", value: SEKFormatter.currency(fee))
            Divider().background(AppTheme.navyBorder)
            row(label: "Total", value: SEKFormatter.currency(total + fee), bold: true)
        }
        .padding(16)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
    }

    private var sendButton: some View {
        Button {
            showSuccess = true
        } label: {
            Text("Send \(SEKFormatter.currency(total))")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(total > 0 ? AppTheme.navy : AppTheme.textMuted)
                .clipShape(.rect(cornerRadius: 14))
        }
        .buttonStyle(.plain)
        .disabled(total <= 0)
    }

    private func field(label: String, placeholder: String, text: Binding<String>, monospaced: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(AppTheme.textSecondary)
            TextField(placeholder, text: text)
                .textInputAutocapitalization(monospaced ? .characters : .sentences)
                .autocorrectionDisabled(monospaced)
                .font(.system(size: 15, weight: .semibold, design: monospaced ? .monospaced : .default))
                .foregroundStyle(AppTheme.textPrimary)
                .padding(14)
                .background(AppTheme.surfaceSecondary)
                .clipShape(.rect(cornerRadius: 12))
        }
    }

    private func row(label: String, value: String, bold: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14, weight: bold ? .bold : .medium))
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 15, weight: bold ? .bold : .semibold))
                .foregroundStyle(bold ? AppTheme.textPrimary : AppTheme.textSecondary)
        }
    }
}
