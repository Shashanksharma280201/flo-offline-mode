import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QCSubmission, QCFormTemplate } from "../types";

interface GeneratePDFOptions {
    submission: QCSubmission;
    template: QCFormTemplate;
    robotId: string;
    mmrNumber?: string;
}

export const generateQCPDF = ({
    submission,
    template,
    robotId,
    mmrNumber
}: GeneratePDFOptions) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Helper function to add new page if needed
    const checkAndAddPage = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
            return true;
        }
        return false;
    };

    // Header with Logo Space
    doc.setFillColor(71, 85, 105); // slate-700
    doc.rect(0, 0, pageWidth, 35, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Quality Control Inspection Report", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(template.name, pageWidth / 2, 25, { align: "center" });

    yPosition = 45;

    // Document Information Section
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(10, yPosition, pageWidth - 20, 50, "F");

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Document Information", 15, yPosition + 8);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const currentDate = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    const infoData = [
        ["MMR Number:", String(mmrNumber || robotId || "N/A")],
        ["Robot ID:", String(robotId || "N/A")],
        ["Status:", String(submission.status || "N/A").toUpperCase()],
        ["Download Date:", String(currentDate)],
        ["Last Edited By:", submission.history && submission.history.length > 0
            ? String(submission.history[submission.history.length - 1]?.editedBy?.name || "N/A")
            : String(submission.submittedBy?.name || "N/A")],
        ["Created By:", String(submission.submittedBy?.name || "N/A")],
        ["Created Date:", submission.createdAt
            ? new Date(submission.createdAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            })
            : "N/A"]
    ];

    let infoY = yPosition + 15;
    infoData.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 15, infoY);
        doc.setFont("helvetica", "normal");
        doc.text(value, 70, infoY);
        infoY += 6;
    });

    yPosition += 58;

    // Metadata Section
    if (submission.metadata && Object.keys(submission.metadata).length > 0) {
        checkAndAddPage(20);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Inspection Details", 15, yPosition);
        yPosition += 8;

        const metadataRows = template.headerFields.map(field => [
            String(field.fieldName || ""),
            String(submission.metadata?.[field.fieldId] || "N/A")
        ]);

        autoTable(doc, {
            startY: yPosition,
            head: [["Field", "Value"]],
            body: metadataRows,
            theme: "grid",
            headStyles: { fillColor: [71, 85, 105], textColor: 255 },
            styles: { fontSize: 9 },
            margin: { left: 15, right: 15 }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // QC Questions by Tab and Category
    template.tabs.forEach(tab => {
        checkAndAddPage(30);

        // Tab Header
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.rect(10, yPosition, pageWidth - 20, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(tab.tabName, 15, yPosition + 7);
        yPosition += 15;

        tab.categories.forEach(category => {
            checkAndAddPage(20);

            doc.setFillColor(226, 232, 240); // slate-200
            doc.rect(10, yPosition, pageWidth - 20, 8, "F");
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(category.categoryName, 15, yPosition + 6);
            yPosition += 12;

            // Questions Table
            const questionRows = category.questions.map(question => {
                const answer = submission.answers?.find(a => a.questionId === question.questionId);

                return [
                    String(question.order || ""),
                    String(question.questionText || ""),
                    String(answer?.status || "NOT ANSWERED").toUpperCase(),
                    String(answer?.remarks || ""),
                    String(answer?.textResponse || ""),
                    answer?.imageUrls && answer.imageUrls.length > 0
                        ? `${answer.imageUrls.length} image(s)`
                        : ""
                ];
            });

            if (questionRows.length > 0) {
                checkAndAddPage(20);

                autoTable(doc, {
                    startY: yPosition,
                    head: [["#", "Question", "Status", "Remarks", "Response", "Images"]],
                    body: questionRows,
                    theme: "striped",
                    headStyles: {
                        fillColor: [71, 85, 105],
                        textColor: 255,
                        fontSize: 8,
                        fontStyle: "bold"
                    },
                    styles: {
                        fontSize: 7,
                        cellPadding: 2
                    },
                    columnStyles: {
                        0: { cellWidth: 8 },
                        1: { cellWidth: 70 },
                        2: { cellWidth: 20, halign: "center" },
                        3: { cellWidth: 35 },
                        4: { cellWidth: 30 },
                        5: { cellWidth: 20, halign: "center" }
                    },
                    margin: { left: 15, right: 15 },
                    didParseCell: (data) => {
                        // Color code status cells
                        if (data.column.index === 2 && data.section === "body") {
                            const status = data.cell.text[0];
                            if (status === "PASSED") {
                                data.cell.styles.textColor = [16, 185, 129]; // emerald-500
                                data.cell.styles.fontStyle = "bold";
                            } else if (status === "REPAIRED" || status === "REPLACED") {
                                data.cell.styles.textColor = [251, 191, 36]; // amber-500
                                data.cell.styles.fontStyle = "bold";
                            } else if (status === "NOT ANSWERED") {
                                data.cell.styles.textColor = [148, 163, 184]; // slate-400
                            }
                        }
                    }
                });

                yPosition = (doc as any).lastAutoTable.finalY + 8;
            }
        });
    });

    // Sign-Off Section
    if (submission.signOff && Object.keys(submission.signOff).length > 0) {
        checkAndAddPage(30);

        doc.setFillColor(16, 185, 129); // emerald-500
        doc.rect(10, yPosition, pageWidth - 20, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Final Sign-Off", 15, yPosition + 7);
        yPosition += 15;

        const signOffRows = template.signOffFields.map(field => [
            String(field.fieldName || ""),
            String(submission.signOff?.[field.fieldId] || "N/A")
        ]);

        autoTable(doc, {
            startY: yPosition,
            head: [["Field", "Value"]],
            body: signOffRows,
            theme: "grid",
            headStyles: { fillColor: [71, 85, 105], textColor: 255 },
            styles: { fontSize: 9 },
            margin: { left: 15, right: 15 }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont("helvetica", "normal");
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
        );
        doc.text(
            `Generated on ${currentDate}`,
            15,
            pageHeight - 10
        );
        doc.text(
            `MMR: ${mmrNumber || robotId}`,
            pageWidth - 15,
            pageHeight - 10,
            { align: "right" }
        );
    }

    // Generate filename
    const filename = `QC_Report_${mmrNumber || robotId}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Save the PDF
    doc.save(filename);
};
