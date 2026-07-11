import type { ToolModule } from '../orchestrator/types.js';
interface SupplyChainConfig {
    minReleaseAgeMinutes: number;
}
export declare function auditSupplyChain(cwd: string, config: SupplyChainConfig): string[];
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=supplyChain.d.ts.map