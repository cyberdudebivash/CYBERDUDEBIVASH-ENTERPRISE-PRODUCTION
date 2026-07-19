/**
 * CYBERDUDEBIVASH® SENTINEL APEX
 * B2B Scoping Configurator & Calculator
 * Handles interactive pricing estimates, custom parameters, and lead capture hooks.
 */

document.addEventListener("DOMContentLoaded", () => {
    initScopingTool();
});

function initScopingTool() {
    const endpointsInput = document.getElementById("scope-endpoints");
    const auditTypeSelect = document.getElementById("scope-audit-type");
    const slaSelect = document.getElementById("scope-sla");
    const irCheck = document.getElementById("scope-ir-retainer");
    const feedCheck = document.getElementById("scope-yara-feed");
    
    // Result elements
    const resultBox = document.getElementById("scope-result-box");
    const resultPrice = document.getElementById("scope-result-price");
    const resultDetail = document.getElementById("scope-result-detail");
    
    // Form trigger
    const scopeCalcBtn = document.getElementById("scope-calc-btn");
    
    // Load cached values
    if (localStorage.getItem("scope_config")) {
        try {
            const config = JSON.parse(localStorage.getItem("scope_config"));
            if (endpointsInput) endpointsInput.value = config.endpoints || 50;
            if (auditTypeSelect) auditTypeSelect.value = config.auditType || "pentest";
            if (slaSelect) slaSelect.value = config.sla || "24h";
            if (irCheck) irCheck.checked = !!config.irRetainer;
            if (feedCheck) feedCheck.checked = !!config.yaraFeed;
            
            // Calculate instantly if cache exists
            calculateScope(endpointsInput, auditTypeSelect, slaSelect, irCheck, feedCheck, resultBox, resultPrice, resultDetail);
        } catch (e) {
            console.error("Failed to parse cached scope configuration:", e);
        }
    }
    
    if (scopeCalcBtn) {
        scopeCalcBtn.addEventListener("click", (e) => {
            e.preventDefault();
            calculateScope(endpointsInput, auditTypeSelect, slaSelect, irCheck, feedCheck, resultBox, resultPrice, resultDetail);
        });
    }
}

function calculateScope(endpointsInput, auditTypeSelect, slaSelect, irCheck, feedCheck, resultBox, resultPrice, resultDetail) {
    if (!endpointsInput || !auditTypeSelect || !slaSelect || !resultBox || !resultPrice || !resultDetail) return;
    
    const endpoints = parseInt(endpointsInput.value) || 10;
    const auditType = auditTypeSelect.value;
    const sla = slaSelect.value;
    const irRetainer = irCheck ? irCheck.checked : false;
    const yaraFeed = feedCheck ? feedCheck.checked : false;
    
    // Base Calculations
    let basePrice = 0;
    let typeName = "";
    
    switch (auditType) {
        case "solidity":
            basePrice = 1500;
            typeName = "Web3 Smart Contract Solidity Audit";
            break;
        case "pentest":
            basePrice = 1200;
            typeName = "Full-Scale Network Penetration Testing";
            break;
        case "cloud":
            basePrice = 1000;
            typeName = "AWS/Azure Cloud SecOps Architecture Review";
            break;
        case "soc2":
            basePrice = 800;
            typeName = "SOC 2 / ISO 27001 Alignment Readiness Audit";
            break;
        default:
            basePrice = 500;
            typeName = "General Infrastructure Vulnerability Assessment";
    }
    
    // Endpoint multiplier
    let endpointCost = endpoints * 15;
    if (endpoints > 500) {
        endpointCost = endpoints * 10; // Bulk discount
    }
    
    // SLA modifier
    let slaCost = 0;
    if (sla === "15m") {
        slaCost = 800;
    } else if (sla === "4h") {
        slaCost = 300;
    }
    
    // Add-on values
    let addonsCost = 0;
    if (irRetainer) addonsCost += 500;
    if (yaraFeed) addonsCost += 250;
    
    const totalMonthly = basePrice + endpointCost + slaCost + addonsCost;
    
    // Set text outputs
    resultPrice.innerText = `$${totalMonthly.toLocaleString()} / month`;
    resultDetail.innerHTML = `
        <strong>Scoping Summary:</strong><br/>
        - Target Framework: ${typeName}<br/>
        - Active Host Nodes: ${endpoints.toLocaleString()}<br/>
        - Selected Incident Response SLA: ${sla === "15m" ? "15-Minute Dedicated Hotline" : sla === "4h" ? "4-Hour High-Priority Response" : "24-Hour Standard Support"}<br/>
        - Dynamic Threat Feeds Add-on: ${yaraFeed ? "Enabled (YARA/Sigma Rule Ingestion)" : "Disabled"}<br/>
        - Incident Response Retainer: ${irRetainer ? "Active Escrow Incident Containment" : "Disabled"}<br/>
    `;
    
    // Show box
    resultBox.style.display = "block";
    
    // Save to Cache
    const configData = {
        endpoints,
        auditType,
        sla,
        irRetainer,
        yaraFeed,
        estimatedTotal: totalMonthly
    };
    localStorage.setItem("scope_config", JSON.stringify(configData));
}
