//
//  LegalView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct LegalView: View {
    enum Mode {
        case privacy, terms

        var title: String {
            switch self {
            case .privacy: return "Privacy Policy"
            case .terms: return "Terms & Conditions"
            }
        }

        var lastUpdated: String {
            "Last updated: July 5, 2026"
        }

        var icon: String {
            switch self {
            case .privacy: return "shield.lefthalf.filled"
            case .terms: return "doc.text.fill"
            }
        }
    }

    let mode: Mode

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                hero
                contentCard
                contactCard
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle(mode.title)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var hero: some View {
        VStack(spacing: 10) {
            Image(systemName: mode.icon)
                .font(.system(size: 30))
                .foregroundStyle(.white)
                .frame(width: 60, height: 60)
                .background(.white.opacity(0.18))
                .clipShape(.rect(cornerRadius: 18))

            Text(mode.title)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
            Text(mode.lastUpdated)
                .font(.system(size: 13, weight: .semibold))
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

    private var contentCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(intro)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(AppTheme.textPrimary)

            ForEach(Array(sections.enumerated()), id: \.offset) { index, section in
                VStack(alignment: .leading, spacing: 8) {
                    Text("\(index + 1). \(section.title)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(AppTheme.textPrimary)

                    Text(section.body)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .padding(.top, 4)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.cardCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
    }

    private var contactCard: some View {
        HStack(spacing: 12) {
            Image(systemName: "envelope.fill")
                .foregroundStyle(AppTheme.navy)
                .frame(width: 40, height: 40)
                .background(AppTheme.navySoft)
                .clipShape(.rect(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 3) {
                Text("Contact us at")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(AppTheme.textSecondary)
                Text("support@swedbank.se")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(AppTheme.navy)
            }
            Spacer()
        }
        .padding(16)
        .background(AppTheme.navySoft)
        .clipShape(.rect(cornerRadius: 14))
    }

    private var intro: String {
        switch mode {
        case .privacy:
            return "This Privacy Policy explains how SwedBank collects, uses, stores, and protects your information when you use the app and related banking services."
        case .terms:
            return "Welcome to SwedBank. By creating an account or using the app, you agree to these Terms and Conditions. Please read them carefully."
        }
    }

    private var sections: [LegalSection] {
        switch mode {
        case .privacy:
            return [
                LegalSection(title: "Information We Collect", body: "We collect account details such as full name, email, phone number, address, and identification documents needed to create and protect your account."),
                LegalSection(title: "How We Use Information", body: "We use your information to operate, secure, and improve banking services including deposits, transfers, withdrawals, card services, and customer support."),
                LegalSection(title: "Data Security", body: "We use industry-standard encryption and security measures to protect your account and personal data. Bank-grade security practices are applied throughout our systems."),
                LegalSection(title: "Data Sharing", body: "We do not sell your personal information. Data is shared only with trusted service providers when needed to operate banking services, comply with legal obligations, or prevent fraud."),
                LegalSection(title: "Data Retention", body: "We retain information for as long as needed to operate the app, maintain transaction records, meet regulatory requirements, and protect account security."),
                LegalSection(title: "User Rights", body: "You may review or update your account information inside the app. You may also contact support regarding privacy concerns, data requests, or account closure."),
                LegalSection(title: "Third-Party Services", body: "Some features rely on secure external providers for hosting, authentication, payments, and notifications. These services process data only as needed to support app functionality."),
                LegalSection(title: "Children", body: "SwedBank is intended for users aged 18 and above."),
                LegalSection(title: "Changes to This Policy", body: "We may update this Privacy Policy from time to time. The updated version will appear in the app with a revised last updated date."),
                LegalSection(title: "Contact Us", body: "If you have questions about this Privacy Policy or your information, please contact support at support@swedbank.se."),
            ]
        case .terms:
            return [
                LegalSection(title: "Acceptance of Terms", body: "By creating an account or using the app, you agree to these Terms and Conditions. You must be at least 18 years old to use SwedBank."),
                LegalSection(title: "Account Registration and Security", body: "You are responsible for keeping your login credentials secure and must notify us immediately if you suspect unauthorized access to your account."),
                LegalSection(title: "Banking Services", body: "SwedBank provides services including account balance, transaction history, bank transfers, IBAN payments, card management, savings, statements, and QR payments."),
                LegalSection(title: "Payments, Wallet, and Fees", body: "Some services may include fees or payment conditions shown inside the app. Completed transactions may be final unless otherwise stated or required by law."),
                LegalSection(title: "Cards", body: "SwedBank may issue virtual or physical cards linked to your account. Card usage is subject to available balance and applicable limits."),
                LegalSection(title: "Prohibited Activities", body: "You must not use the app for fraud, money laundering, unlawful activity, or attempts to bypass platform security measures."),
                LegalSection(title: "Suspension and Termination", body: "We may suspend, restrict, or close accounts when suspicious, unsafe, or policy-violating activity is detected. Some records may be retained for legal and regulatory reasons."),
                LegalSection(title: "Limitation of Liability", body: "We aim to provide a reliable service but do not guarantee uninterrupted availability. To the extent allowed by law, SwedBank is not liable for indirect losses beyond our reasonable control."),
                LegalSection(title: "Privacy", body: "Your use of the app is also subject to our Privacy Policy. By using the app, you agree to how information is collected and protected as described therein."),
                LegalSection(title: "Changes to These Terms", body: "We may update these Terms from time to time. The latest version will be shown in the app with a revised last updated date."),
                LegalSection(title: "Contact and Support", body: "For questions about these Terms, please contact support at support@swedbank.se. We aim to respond as soon as reasonably possible."),
            ]
        }
    }
}

struct LegalSection {
    let title: String
    let body: String
}
