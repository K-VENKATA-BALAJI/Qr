# Base Paper & References for SafeScan

This document lists **base papers** and key references for the **SafeScan** project: a mobile app that lets users scan QR codes and receive a **safety report** (expanded URL, risk score, verdict, screenshot) before opening any link—i.e. *proactive QR code defense* against quishing (QR-based phishing).

---

## Primary base paper (framework & motivation)

**Quishing - A Review of QR Code Attacks and a Framework Design for Safe Scanning**  
Emil Pricop, Sanda Florentina Mihalache.  
*Proceedings of Fifth Emerging Trends and Technologies on Intelligent Systems (ETTIS 2025)*, Springer, pp. 284–296, 2026.

- **DOI:** https://doi.org/10.1007/978-981-95-0681-1_24  
- **Link:** https://link.springer.com/chapter/10.1007/978-981-95-0681-1_24  

**Why it fits:** The paper explicitly proposes a **framework for safe scanning** of QR codes, combining technical methods (URL reveal, URL testing for malware/blacklists) and user awareness—directly aligned with SafeScan’s “scan first, get a report, then decide” flow.

**Abstract (summary):** QR codes are widely used; quishing uses them to trick users into disclosing data or visiting malicious content. The paper reviews attack types (information disclosure, fake payments, crypto hijacking, etc.), presents protection methods, and proposes a framework using both technical checks (URL reveal, malware/blacklist testing) and user vigilance for safe QR scanning.

---

## Survey & taxonomy (attacks and countermeasures)

**A survey of the QR code phishing: the current attacks and countermeasures**  
K. S. C. Yong, K. L. Chiew, C. L. Tan.  
*7th IEEE International Conference on Smart Computing & Communications (ICSCC)*, 2019, pp. 1–5.

- **IEEE Xplore:** https://ieeexplore.ieee.org/document/8843688  

**Why it fits:** Standard survey for citing “current attacks and countermeasures” in QR code phishing; useful for related work and to position SafeScan among technical countermeasures (e.g. URL preview and reputation).

---

## Empirical / user studies (quishing effectiveness)

### 1. Gone Quishing: A Field Study of Phishing with Malicious QR Codes

Filipo Sharevski, Amy Devine, Emma Pieroni, Peter Jachim.  
*arXiv:2204.04086* [cs.CR], 2022.

- **arXiv:** https://arxiv.org/abs/2204.04086  
- **PDF:** https://arxiv.org/pdf/2204.04086  
- **DOI:** https://doi.org/10.48550/arXiv.2204.04086  

**Abstract (summary):** COVID-19 made “quishing” (phishing via malicious QR codes) common. In a 173-participant study using a COVID-19 digital passport sign-up with a malicious QR code, 67% signed up with Google/Facebook, 18.5% created a new account, 14.5% skipped. Convenience was the main reason for yielding credentials. The authors propose a Quishing Awareness Scale (QAS), link behavior to sign-up choices, and suggest awareness training and usable security indicators—relevant to why “scan first, report, then decide” (SafeScan) is needed.

### 2. Hooked: A Real-World Study on QR Code Phishing

Marvin Geisler, Daniela Pöhn, Wolfgang Hommel.  
*arXiv:2407.16230*, 2024.

- **arXiv:** https://arxiv.org/html/2407.16230v1  

**Summary:** Real-world phishing campaign with two QR poster variants (plain vs. professional + voucher) at a research campus. Professionally designed QR codes received clearly more engagement. Technical-savvy users were more aware of risks; the work underscores the need for scalable awareness and technical countermeasures—consistent with SafeScan’s proactive checking.

---

## Classic reference (early QR phishing susceptibility)

**QRishing: The Susceptibility of Smartphone Users to QR Code Phishing Attacks**  
T. Vidas, E. Owusu, S. Wang, C. Zeng, L. F. Cranor, N. Christin.  
*Financial Cryptography and Data Security*, Springer, 2013, pp. 52–69.

**Why it fits:** Early empirical study on smartphone users’ susceptibility to QR-based phishing; often cited to motivate the need for safe-scanning tools like SafeScan.

---

## How SafeScan maps to the literature

| Paper / theme                         | Relevance to SafeScan                                                                 |
|---------------------------------------|----------------------------------------------------------------------------------------|
| Pricop & Mihalache (Safe Scanning)    | Direct conceptual match: “safe scanning” framework with URL reveal + checks.          |
| Yong et al. (IEEE survey)             | Taxonomy of attacks and countermeasures; SafeScan as a technical countermeasure.     |
| Sharevski et al. (Gone Quishing)      | User susceptibility and need for pre-visit safety information.                       |
| Geisler et al. (Hooked)               | Real-world effectiveness of QR phishing; need for technical + awareness solutions.  |
| Vidas et al. (QRishing)               | Foundational evidence that users are susceptible; motivates proactive defense.      |

---

## Suggested citation (for reports/thesis)

For a short “base paper” citation when describing the problem and approach:

- **Framework / safe scanning:** Pricop, E., & Mihalache, S. F. (2026). Quishing - A Review of QR Code Attacks and a Framework Design for Safe Scanning. In *ETTIS 2025*. Springer. https://doi.org/10.1007/978-981-95-0681-1_24  

For surveys and user studies, use the IEEE survey (Yong et al.) and Sharevski et al. / Geisler et al. as above.

---

## BibTeX (selected)

```bibtex
@inproceedings{pricop2026quishing,
  author    = {Pricop, Emil and Mihalache, Sanda Florentina},
  title     = {Quishing - A Review of QR Code Attacks and a Framework Design for Safe Scanning},
  booktitle = {Proceedings of Fifth Emerging Trends and Technologies on Intelligent Systems (ETTIS 2025)},
  pages     = {284--296},
  year      = {2026},
  publisher = {Springer},
  address   = {Singapore},
  doi       = {10.1007/978-981-95-0681-1_24}
}

@inproceedings{yong2019survey,
  author    = {Yong, K. S. C. and Chiew, K. L. and Tan, C. L.},
  title     = {A survey of the QR code phishing: the current attacks and countermeasures},
  booktitle = {7th IEEE International Conference on Smart Computing \& Communications (ICSCC)},
  pages     = {1--5},
  year      = {2019}
}

@article{sharevski2022quishing,
  author  = {Sharevski, Filipo and Devine, Amy and Pieroni, Emma and Jachim, Peter},
  title   = {Gone Quishing: A Field Study of Phishing with Malicious QR Codes},
  journal = {arXiv preprint arXiv:2204.04086},
  year    = {2022},
  url     = {https://arxiv.org/abs/2204.04086}
}
```

---

*Last updated for the SafeScan (qr-mobile) project.*
