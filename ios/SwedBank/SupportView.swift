//
//  SupportView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct SupportView: View {
    private let faqs: [FAQ] = [
        FAQ(question: "How do I deposit money into my account?", answer: "Open the Transfer tab, tap Deposit, choose a method (Bankgiro, Plusgiro, Swish, or Instant), enter the amount, and submit your request."),
        FAQ(question: "How long do bank transfers take?", answer: "SEK transfers between Swedish banks usually arrive within minutes during business hours. International transfers may take 1–3 business days."),
        FAQ(question: "Is my money safe with SwedBank?", answer: "Yes. We use bank-grade encryption and security practices. Always enable biometric login and keep your credentials private."),
        FAQ(question: "How do I reset my password?", answer: "Go to Settings → Security → Reset Password. Follow the prompts to set a new password securely."),
        FAQ(question: "Can I use QR payments everywhere?", answer: "QR payments work with supported merchants and SwedBank partners. Show your QR code to receive funds, or scan to pay."),
        FAQ(question: "How do I view my statements?", answer: "Go to Settings → Statements to download monthly statements showing your opening and closing balances."),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                header
                contactMethods
                faqSection
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("Help Center")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var header: some View {
        VStack(spacing: 10) {
            Image(systemName: "questionmark.circle.fill")
                .font(.system(size: 38))
                .foregroundStyle(.white)
                .frame(width: 72, height: 72)
                .background(.white.opacity(0.18))
                .clipShape(.rect(cornerRadius: 22))

            Text("How can we help?")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
            Text("Browse FAQs or reach out to our support team")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white.opacity(0.85))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 22)
        .background {
            LinearGradient(colors: [AppTheme.navy, AppTheme.navyMid], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
        .clipShape(.rect(cornerRadius: AppTheme.cardCorner))
        .shadow(color: AppTheme.navy.opacity(0.2), radius: 12, y: 6)
    }

    private var contactMethods: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Contact Us")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                contactRow(icon: "envelope.fill", label: "Email", value: "support@swedbank.se")
                Divider().background(AppTheme.navyBorder).padding(.leading, 58)
                contactRow(icon: "phone.fill", label: "Phone", value: "+46 8 585 900 00")
            }
            .background(.white)
            .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
            .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
        }
    }

    private func contactRow(icon: String, label: String, value: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(AppTheme.navy)
                .clipShape(.rect(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(AppTheme.textSecondary)
                Text(value)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.textPrimary)
            }
            Spacer()
            Image(systemName: "chevron.right").foregroundStyle(AppTheme.textMuted)
        }
        .padding(14)
    }

    private var faqSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Frequently Asked Questions")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                ForEach(Array(faqs.enumerated()), id: \.offset) { index, faq in
                    FAQRow(faq: faq)
                    if index < faqs.count - 1 {
                        Divider().background(AppTheme.navyBorder).padding(.leading, 16)
                    }
                }
            }
            .background(.white)
            .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
            .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
        }
    }
}

struct FAQRow: View {
    let faq: FAQ
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.spring(response: 0.3)) { expanded.toggle() }
            } label: {
                HStack {
                    Text(faq.question)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(AppTheme.textPrimary)
                        .multilineTextAlignment(.leading)
                    Spacer()
                    Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        .foregroundStyle(AppTheme.textMuted)
                }
                .padding(16)
            }
            .buttonStyle(.plain)

            if expanded {
                Text(faq.answer)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(AppTheme.textSecondary)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 14)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }
}

struct FAQ {
    let question: String
    let answer: String
}
