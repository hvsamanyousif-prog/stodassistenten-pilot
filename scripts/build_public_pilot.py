#!/usr/bin/env python3
"""Build the minimal GitHub Pages artifact for the public Stödassistenten pilot.

The root ``index.html`` is the shared platform shell. The preserved person pilot
lives at ``person-pilot.html`` and receives the public capability runtime at build
time. Company and focused quick-help pages remain modules inside the same deployed
site. Small governed runtime blocks add feedback coverage, privacy-preserving
route handoff and professional guidance without duplicating product engines.
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

MANAGED_START = "<!-- STOD_CAPABILITY_WIRING_START -->"
MANAGED_END = "<!-- STOD_CAPABILITY_WIRING_END -->"
SHELL_LEARNING_START = "<!-- STOD_EXPERIENCE_LEARNING_START -->"
SHELL_LEARNING_END = "<!-- STOD_EXPERIENCE_LEARNING_END -->"
QUICK_LEARNING_START = "<!-- STOD_QUICK_HELP_LEARNING_START -->"
QUICK_LEARNING_END = "<!-- STOD_QUICK_HELP_LEARNING_END -->"
COMPANY_CONTINUITY_START = "<!-- STOD_COMPANY_FUNDING_CONTINUITY_START -->"
COMPANY_CONTINUITY_END = "<!-- STOD_COMPANY_FUNDING_CONTINUITY_END -->"
SHELL_REFLOW_START = "<!-- STOD_SHARED_SHELL_REFLOW_START -->"
SHELL_REFLOW_END = "<!-- STOD_SHARED_SHELL_REFLOW_END -->"
SHELL_ROUTING_PATH = "client/privacy-routing.js"
HELPER_SCOPE_CONTINUITY_PATH = "client/helper-scope-continuity.js"
CONCRETE_NEED_CONTINUITY_PATH = "client/concrete-need-continuity.js"
SHELL_LEARNING_PATH = "client/experience-learning.js"
SHELL_GUIDANCE_PATH = "client/professional-guidance.js"
STUDY_TRANSITION_PATH = "client/study-transition.js"
STUDENT_FINANCE_GUIDANCE_PATH = "client/student-finance-guidance.js"
YOUNG_HOUSING_TRANSITION_PATH = "client/young-housing-transition.js"
RELATIVE_CARE_PATH = "client/relative-care.js"
ECONOMIC_ASSISTANCE_PATH = "client/economic-assistance.js"
JOB_PREMIUM_GUIDANCE_PATH = "client/job-premium-guidance.js"
UNEMPLOYED_SICK_GUIDANCE_PATH = "client/unemployed-sick-guidance.js"
EMPLOYEE_SICK_GUIDANCE_PATH = "client/employee-sick-guidance.js"
EMPLOYEE_SICK_WORK_CONTEXT_PATH = "client/employee-sick-work-context-extension.js"
PREVENTIVE_TREATMENT_PATH = "client/preventive-treatment.js"
WORK_INJURY_DENTAL_PATH = "client/work-injury-dental.js"
AGE30_TRANSITION_PATH = "client/age30-transition.js"
PENSION_HOUSING_PATH = "client/pension-housing.js"
SCHOOL_SUPPORT_PATH = "client/school-support-guidance.js"
PROPERTY_CHARGING_PATH = "client/property-charging-guidance.js"
ADULT_EXTRA_COSTS_PATH = "client/adult-extra-costs-guidance.js"
CHILD_MAINTENANCE_PATH = "client/child-maintenance-guidance.js"
OLDER_HOME_SUPPORT_PATH = "client/older-home-support-guidance.js"
DISABILITY_HOME_SUPPORT_PATH = "client/disability-home-support-guidance.js"
CHILD_ASSISTANCE_CONTEXT_PATH = "client/child-assistance-context-extension.js"
MOBILITY_TRANSPORT_PATH = "client/mobility-transport-guidance.js"
BEREAVEMENT_GUIDANCE_PATH = "client/bereavement-guidance.js"
QUICK_LEARNING_PATH = "client/quick-help-feedback.js"
QUICK_GUIDANCE_PATH = "client/quick-help-guidance.js"
HOUSING_GUIDANCE_PATH = "client/housing-adaptation-guidance.js"
DENTAL_67_GUIDANCE_PATH = "client/dental-67-guidance.js"
PERSON_CONTEXT_PATH = "client/person-context-learning.js"
UNEMPLOYMENT_REGIME_GUIDANCE_PATH = "client/unemployment-regime-guidance.js"
FAMILY_HOUSING_GUIDANCE_PATH = "client/family-housing-guidance.js"
FUNDING_DISCOVERY_PATH = "client/funding-discovery-guidance.js"
FAMILY_AGE_ROUTING_PATH = "client/family-age-routing.js"
ASSISTANCE_FOCUS_PATH = "client/assistance-focus.js"
VAB_FOCUS_PATH = "client/vab-focus.js"
PROPERTY_FOCUS_PATH = "client/property-accessibility-focus.js"
FUNDING_INTENT_CONTINUITY_PATH = "client/funding-intent-continuity.js"
SHELL_RUNTIME_PATHS = (
    SHELL_ROUTING_PATH,
    HELPER_SCOPE_CONTINUITY_PATH,
    CONCRETE_NEED_CONTINUITY_PATH,
    SHELL_LEARNING_PATH,
    SHELL_GUIDANCE_PATH,
    STUDY_TRANSITION_PATH,
    STUDENT_FINANCE_GUIDANCE_PATH,
    YOUNG_HOUSING_TRANSITION_PATH,
    RELATIVE_CARE_PATH,
    ECONOMIC_ASSISTANCE_PATH,
    JOB_PREMIUM_GUIDANCE_PATH,
    UNEMPLOYED_SICK_GUIDANCE_PATH,
    EMPLOYEE_SICK_GUIDANCE_PATH,
    EMPLOYEE_SICK_WORK_CONTEXT_PATH,
    PREVENTIVE_TREATMENT_PATH,
    WORK_INJURY_DENTAL_PATH,
    AGE30_TRANSITION_PATH,
    PENSION_HOUSING_PATH,
    SCHOOL_SUPPORT_PATH,
    PROPERTY_CHARGING_PATH,
    ADULT_EXTRA_COSTS_PATH,
    CHILD_MAINTENANCE_PATH,
    OLDER_HOME_SUPPORT_PATH,
    DISABILITY_HOME_SUPPORT_PATH,
    CHILD_ASSISTANCE_CONTEXT_PATH,
    MOBILITY_TRANSPORT_PATH,
    BEREAVEMENT_GUIDANCE_PATH,
)
QUICK_RUNTIME_PATHS = (QUICK_LEARNING_PATH, QUICK_GUIDANCE_PATH, HOUSING_GUIDANCE_PATH, DENTAL_67_GUIDANCE_PATH)
SCRIPT_PATHS = (
    "client/capabilities.js",
    "client/pilot-surface.js",
    "client/public-pilot-ui-gate.js",
    "client/public-pilot-wiring.js",
    PERSON_CONTEXT_PATH,
    UNEMPLOYMENT_REGIME_GUIDANCE_PATH,
    FAMILY_HOUSING_GUIDANCE_PATH,
    FUNDING_DISCOVERY_PATH,
    FAMILY_AGE_ROUTING_PATH,
    ASSISTANCE_FOCUS_PATH,
    VAB_FOCUS_PATH,
    PROPERTY_FOCUS_PATH,
    STUDY_TRANSITION_PATH,
    STUDENT_FINANCE_GUIDANCE_PATH,
    YOUNG_HOUSING_TRANSITION_PATH,
    RELATIVE_CARE_PATH,
    ECONOMIC_ASSISTANCE_PATH,
    JOB_PREMIUM_GUIDANCE_PATH,
    UNEMPLOYED_SICK_GUIDANCE_PATH,
    EMPLOYEE_SICK_GUIDANCE_PATH,
    EMPLOYEE_SICK_WORK_CONTEXT_PATH,
    PREVENTIVE_TREATMENT_PATH,
    WORK_INJURY_DENTAL_PATH,
    AGE30_TRANSITION_PATH,
    PENSION_HOUSING_PATH,
    SCHOOL_SUPPORT_PATH,
    PROPERTY_CHARGING_PATH,
    ADULT_EXTRA_COSTS_PATH,
    CHILD_MAINTENANCE_PATH,
    OLDER_HOME_SUPPORT_PATH,
    DISABILITY_HOME_SUPPORT_PATH,
    CHILD_ASSISTANCE_CONTEXT_PATH,
    MOBILITY_TRANSPORT_PATH,
    BEREAVEMENT_GUIDANCE_PATH,
    FUNDING_INTENT_CONTINUITY_PATH,
    CONCRETE_NEED_CONTINUITY_PATH,
)
PROFILE_PATH = "config/public_pilot_capabilities.json"
PERSON_PILOT_PATH = "person-pilot.html"
MODULE_PILOT_PATHS = ("company-pilot.html", "quick-help.html")


def wiring_block() -> str:
    lines = [MANAGED_START]
    lines.extend(f'<script src="{path}"></script>' for path in SCRIPT_PATHS)
    lines.append(MANAGED_END)
    return "\n".join(lines)


def shell_learning_block() -> str:
    lines = [SHELL_LEARNING_START]
    lines.extend(f'<script src="{path}"></script>' for path in SHELL_RUNTIME_PATHS)
    lines.append(SHELL_LEARNING_END)
    return "\n".join(lines)


def quick_learning_block() -> str:
    lines = [QUICK_LEARNING_START]
    lines.extend(f'<script src="{path}"></script>' for path in QUICK_RUNTIME_PATHS)
    lines.append(QUICK_LEARNING_END)
    return "\n".join(lines)


def company_continuity_block() -> str:
    return "\n".join(
        (
            COMPANY_CONTINUITY_START,
            f'<script src="{FUNDING_INTENT_CONTINUITY_PATH}"></script>',
            COMPANY_CONTINUITY_END,
        )
    )


def shell_reflow_block() -> str:
    # The source shell slightly exceeds a 320 CSS-pixel viewport because the
    # brand and three language controls compete for the same navigation row.
    # Keep every control visible and make the language targets at least 44x44.
    return "\n".join(
        (
            SHELL_REFLOW_START,
            '<style id="shared-shell-reflow-guard">',
            '@media(max-width:620px){.lang{min-width:44px;min-height:44px}}',
            '@media(max-width:360px){.nav{gap:6px}.brand{gap:6px;font-size:13px;min-width:0}.mark{width:32px;height:32px;border-radius:10px;flex:0 0 32px}.langs{gap:0;flex:0 0 auto}.lang{padding-left:4px;padding-right:4px}}',
            '</style>',
            SHELL_REFLOW_END,
        )
    )


def inject_before_body(html: str, block: str, forbidden_markers: tuple[str, ...]) -> str:
    if any(marker in html for marker in forbidden_markers):
        raise ValueError("source HTML already contains managed wiring")
    if html.count("</body>") != 1:
        raise ValueError("source HTML must contain exactly one </body>")
    return html.replace("</body>", f"{block}\n</body>", 1)


def inject_before_head_close(html: str, block: str, forbidden_markers: tuple[str, ...]) -> str:
    if any(marker in html for marker in forbidden_markers):
        raise ValueError("source HTML already contains managed reflow guard")
    if html.count("</head>") != 1:
        raise ValueError("source HTML must contain exactly one </head>")
    return html.replace("</head>", f"{block}\n</head>", 1)


def inject_wiring(html: str) -> str:
    return inject_before_body(html, wiring_block(), (MANAGED_START, MANAGED_END))


def inject_shell_learning(html: str) -> str:
    return inject_before_body(html, shell_learning_block(), (SHELL_LEARNING_START, SHELL_LEARNING_END))


def inject_quick_learning(html: str) -> str:
    return inject_before_body(html, quick_learning_block(), (QUICK_LEARNING_START, QUICK_LEARNING_END))


def inject_company_continuity(html: str) -> str:
    return inject_before_body(html, company_continuity_block(), (COMPANY_CONTINUITY_START, COMPANY_CONTINUITY_END))


def inject_shell_reflow(html: str) -> str:
    return inject_before_head_close(html, shell_reflow_block(), (SHELL_REFLOW_START, SHELL_REFLOW_END))


def repair_known_inline_syntax(html: str, page: str) -> str:
    """Hotfix the two locale-object brace regressions that reached main.

    This is intentionally narrow and fail-closed: the build only repairs the
    exact structural signature we observed. Source files should be corrected
    separately; this protects the live Pages artifact immediately.
    """
    if page == "index.html":
        marker = "company-pilot.html?actor_type=company']]}}\n};\nconst KEYWORDS="
        fixed = "company-pilot.html?actor_type=company']]}\n};\nconst KEYWORDS="
    elif page == "quick-help.html":
        marker = "unsure:['می‌خواهم بدانم چه کمک‌هایی وجود دارد','گسترده شروع کن.']}}}}\n};\nconst SV_RESULTS="
        fixed = "unsure:['می‌خواهم بدانم چه کمک‌هایی وجود دارد','گسترده شروع کن.']}}}\n};\nconst SV_RESULTS="
    else:
        return html
    if marker in html:
        return html.replace(marker, fixed, 1)
    return html


def validate_inline_javascript(html: str, label: str) -> None:
    scripts = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, flags=re.S)
    with tempfile.TemporaryDirectory() as tmp:
        for i, script in enumerate(scripts):
            if not script.strip():
                continue
            path = Path(tmp) / f"{label.replace('/', '_')}-{i}.js"
            path.write_text(script, encoding="utf-8")
            proc = subprocess.run(
                ["node", "--check", str(path)],
                capture_output=True,
                text=True,
                check=False,
            )
            if proc.returncode:
                detail = (proc.stderr or proc.stdout).strip()
                raise ValueError(f"inline JavaScript syntax invalid in {label} script {i}: {detail}")


def copy_required_asset(source_root: Path, output_root: Path, relative_path: str) -> None:
    source = source_root / relative_path
    if not source.is_file():
        raise FileNotFoundError(f"required public pilot asset is missing: {relative_path}")
    destination = output_root / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def build(source_root: Path, output_root: Path) -> Path:
    source_root = source_root.resolve()
    output_root = output_root.resolve()
    source_index = source_root / "index.html"
    source_person = source_root / PERSON_PILOT_PATH
    source_company = source_root / "company-pilot.html"
    source_quick = source_root / "quick-help.html"
    if not source_index.is_file():
        raise FileNotFoundError("index.html is missing")
    if not source_person.is_file():
        raise FileNotFoundError(f"{PERSON_PILOT_PATH} is missing")
    if not source_company.is_file():
        raise FileNotFoundError("company-pilot.html is missing")
    if not source_quick.is_file():
        raise FileNotFoundError("quick-help.html is missing")
    if source_root == output_root:
        raise ValueError("output directory must differ from source root")

    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True)

    shell_html = repair_known_inline_syntax(source_index.read_text(encoding="utf-8"), "index.html")
    shell_html = inject_shell_reflow(shell_html)
    built_shell = inject_shell_learning(shell_html)
    validate_inline_javascript(built_shell, "index.html")
    (output_root / "index.html").write_text(built_shell, encoding="utf-8")

    person_html = source_person.read_text(encoding="utf-8")
    built_person = inject_wiring(person_html)
    validate_inline_javascript(built_person, PERSON_PILOT_PATH)
    (output_root / PERSON_PILOT_PATH).write_text(built_person, encoding="utf-8")

    company_html = source_company.read_text(encoding="utf-8")
    built_company = inject_company_continuity(company_html)
    validate_inline_javascript(built_company, "company-pilot.html")
    (output_root / "company-pilot.html").write_text(built_company, encoding="utf-8")

    quick_html = repair_known_inline_syntax(source_quick.read_text(encoding="utf-8"), "quick-help.html")
    built_quick = inject_quick_learning(quick_html)
    validate_inline_javascript(built_quick, "quick-help.html")
    (output_root / "quick-help.html").write_text(built_quick, encoding="utf-8")

    for path in SCRIPT_PATHS:
        copy_required_asset(source_root, output_root, path)
    for path in SHELL_RUNTIME_PATHS:
        copy_required_asset(source_root, output_root, path)
    for path in QUICK_RUNTIME_PATHS:
        copy_required_asset(source_root, output_root, path)
    copy_required_asset(source_root, output_root, PROFILE_PATH)
    return output_root / "index.html"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=".", help="repository root")
    parser.add_argument("--output", default="_site", help="build output directory")
    args = parser.parse_args()
    built = build(Path(args.source), Path(args.output))
    print(f"public pilot build: OK ({built})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
