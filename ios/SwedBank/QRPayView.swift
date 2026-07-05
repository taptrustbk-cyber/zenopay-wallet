//
//  QRPayView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI
import CoreImage.CIFilterBuiltins

struct QRPayView: View {
    private let user = BankModel.shared.user
    @State private var showScanner = false

    private let qrPayload: String = "SWEDBANK:SE4550000000058398257466:ERIK LINDBERG"

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                qrCard
                instructions
                scanButton
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("QR Payment")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var qrCard: some View {
        VStack(spacing: 16) {
            Text("Your Payment QR")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AppTheme.textSecondary)

            if let image = generateQRImage(from: qrPayload) {
                Image(uiImage: image)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 220, height: 220)
                    .padding(16)
                    .background(.white)
                    .clipShape(.rect(cornerRadius: 18))
                    .shadow(color: AppTheme.shadowColor.opacity(0.15), radius: 12, y: 6)
            }

            VStack(spacing: 4) {
                Text(user.fullName)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text(SEKFormatter.maskedIBAN(user.iban))
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.cardCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.1), radius: 10, y: 5)
    }

    private var instructions: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Show this QR to receive payments instantly.", systemImage: "info.circle.fill")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(AppTheme.textPrimary)
            Label("Merchants can scan to request funds from your account.", systemImage: "shield.lefthalf.filled")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppTheme.navySoft)
        .clipShape(.rect(cornerRadius: 14))
    }

    private var scanButton: some View {
        Button {
            showScanner = true
        } label: {
            Label("Scan to Pay", systemImage: "qrcode.viewfinder")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(AppTheme.navy)
                .clipShape(.rect(cornerRadius: 14))
        }
        .buttonStyle(.plain)
        .alert("QR Scanner", isPresented: $showScanner) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Install this app on your device via the Rork App to use the camera scanner.")
        }
    }

    private func generateQRImage(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let outputImage = filter.outputImage else { return nil }
        let scaled = outputImage.transformed(by: CGAffineTransform(scaleX: 8, y: 8))
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
