/**
 * Patrick Method 核心算法實現
 * 支援單輸出和多輸出邏輯最小化
 */

class PatrickMethod {
    constructor() {
        this.variables = [];
        this.primeImplicants = [];
        this.minterms = [];
        this.dontCares = [];
        this.coverageTable = {};
        this.essentialPIs = [];
        this.calculationSteps = [];
        this.sharedTerms = [];
    }

    /**
     * 解析變數字串
     */
    parseVariables(variableStr) {
        if (variableStr.includes(',')) {
            this.variables = variableStr.split(',').map(v => v.trim());
        } else {
            this.variables = variableStr.split('').map(v => v.trim());
        }
        return this.variables;
    }

    /**
     * 解析Prime Implicants字串
     */
    parsePrimeImplicants(piStr) {
        this.primeImplicants = [];
        const lines = piStr.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.includes(':')) {
                const [name, pattern] = trimmedLine.split(':').map(part => part.trim());
                // 移除可能的空格和符號
                const cleanPattern = pattern.replace(/[^01-]/g, '');
                if (cleanPattern.length > 0) {
                    this.primeImplicants.push({
                        name: name,
                        pattern: cleanPattern,
                        minterms: this.convertPatternToMinterms(cleanPattern)
                    });
                }
            } else if (trimmedLine.match(/^[01-]+$/)) {
                // 直接的pattern格式
                const cleanPattern = trimmedLine.replace(/[^01-]/g, '');
                if (cleanPattern.length > 0) {
                    this.primeImplicants.push({
                        name: `P${this.primeImplicants.length + 1}`,
                        pattern: cleanPattern,
                        minterms: this.convertPatternToMinterms(cleanPattern)
                    });
                }
            }
        });
        
        return this.primeImplicants;
    }

    /**
     * 只生成真正的Prime Implicants（單函數模式專用）
     * 只收集迭代合成後的產物，不包含中間層級的implicants
     */
    generateOnlyTruePrimeImplicants(minterms, numVars, dontCares = []) {
        console.log(`單函數模式生成真正的Prime Implicants: minterms=[${minterms.join(',')}], numVars=${numVars}`);
        
        // 合併 minterms 和 don't cares
        const allTerms = [...minterms, ...dontCares].map(term => parseInt(term, 10));
        const uniqueTerms = [...new Set(allTerms)].filter(term => !isNaN(term));
        
        // 轉換為二進制表示，作為第0層
        let currentLevel = uniqueTerms.map(term => {
            const binary = term.toString(2).padStart(numVars, '0');
            return {
                binary: binary,
                minterms: [term],
                level: 0
            };
        });
        
        const allImplicants = [];
        let levelNumber = 0;
        
        // 逐層生成更高級的 implicants
        while (currentLevel.length > 0) {
            const nextLevel = [];
            const usedIndices = new Set();
            
            // 按二進制中1的數量分組
            const groups = {};
            currentLevel.forEach((term, index) => {
                const ones = (term.binary.match(/1/g) || []).length;
                if (!groups[ones]) groups[ones] = [];
                groups[ones].push({...term, index});
            });
            
            // 嘗試組合相鄰組
            const groupKeys = Object.keys(groups).map(k => parseInt(k)).sort((a, b) => a - b);
            for (let i = 0; i < groupKeys.length - 1; i++) {
                const group1 = groups[groupKeys[i]];
                const group2 = groups[groupKeys[i + 1]];
                
                group1.forEach(term1 => {
                    group2.forEach(term2 => {
                        const combined = this.combineBinaryTerms(term1.binary, term2.binary);
                        if (combined) {
                            // 檢查是否已存在相同的組合
                            const existingTerm = nextLevel.find(t => t.binary === combined);
                            if (!existingTerm) {
                                nextLevel.push({
                                    binary: combined,
                                    minterms: [...new Set([...term1.minterms, ...term2.minterms])].sort((a, b) => a - b),
                                    level: levelNumber + 1
                                });
                            }
                            
                            usedIndices.add(term1.index);
                            usedIndices.add(term2.index);
                        }
                    });
                });
            }
            
            // 將無法再合成的項目加入到最終結果 (這些就是Prime Implicants)
            currentLevel.forEach((term, index) => {
                if (!usedIndices.has(index)) {
                    allImplicants.push(term);
                }
            });
            
            // 如果沒有下一層，迭代結束
            if (nextLevel.length === 0) {
                break;
            }
            
            currentLevel = nextLevel;
            levelNumber++;
        }
        
        // 最後一層的所有項目都是Prime Implicants
        // 注意：這些項目在迭代過程中已經被添加到allImplicants中了（作為無法再合成的項目）
        // 所以不需要重複添加
        // allImplicants.push(...currentLevel); // 移除這行避免重複
        
        // 過濾出只包含實際minterms的Prime Implicants，並去重
        const truePrimeImplicants = [];
        const seenPatterns = new Set();
        
        allImplicants.forEach(implicant => {
            const coveredMinterms = implicant.minterms.filter(m => minterms.includes(m));
            if (coveredMinterms.length > 0 && !seenPatterns.has(implicant.binary)) {
                seenPatterns.add(implicant.binary);
                truePrimeImplicants.push({
                    pattern: implicant.binary,
                    minterms: coveredMinterms
                });
            }
        });
        
        console.log(`生成了 ${truePrimeImplicants.length} 個真正的Prime Implicants`);
        console.log(`所有生成的implicants (${allImplicants.length}個):`, allImplicants.map(i => `${i.binary}:[${i.minterms.join(',')}]`));
        truePrimeImplicants.forEach((pi, index) => {
            console.log(`PI${index+1}: ${pi.pattern} → 覆蓋 m${pi.minterms.join(',m')}`);
        });
        
        return truePrimeImplicants;
    }

    /**
     * 為單函數生成真正的 Prime Implicants（舊版本方法，保留備用）
     */
    generateTruePrimeImplicantsForSingleFunction(minterms, numVars, dontCares = []) {
        console.log(`單函數模式生成 Prime Implicants: minterms=[${minterms.join(',')}], numVars=${numVars}`);
        
        // 合併 minterms 和 don't cares
        const allTerms = [...minterms, ...dontCares].map(term => parseInt(term, 10));
        const uniqueTerms = [...new Set(allTerms)].filter(term => !isNaN(term));
        
        // 轉換為二進制表示，作為第0層
        let currentLevel = uniqueTerms.map(term => {
            const binary = term.toString(2).padStart(numVars, '0');
            return {
                binary: binary,
                minterms: [term],
                level: 0
            };
        });
        
        const allImplicants = [...currentLevel];
        let levelNumber = 0;
        
        // 逐層生成更高級的 implicants
        while (currentLevel.length > 1) {
            const nextLevel = [];
            const usedIndices = new Set();
            
            // 按二進制中1的數量分組
            const groups = {};
            currentLevel.forEach((term, index) => {
                const ones = (term.binary.match(/1/g) || []).length;
                if (!groups[ones]) groups[ones] = [];
                groups[ones].push({...term, index});
            });
            
            // 嘗試組合相鄰組
            const groupKeys = Object.keys(groups).map(k => parseInt(k)).sort((a, b) => a - b);
            for (let i = 0; i < groupKeys.length - 1; i++) {
                const group1 = groups[groupKeys[i]];
                const group2 = groups[groupKeys[i + 1]];
                
                group1.forEach(term1 => {
                    group2.forEach(term2 => {
                        const combined = this.combineBinaryTerms(term1.binary, term2.binary);
                        if (combined) {
                            // 檢查是否已存在相同的組合
                            const existingTerm = nextLevel.find(t => t.binary === combined);
                            if (!existingTerm) {
                                nextLevel.push({
                                    binary: combined,
                                    minterms: [...new Set([...term1.minterms, ...term2.minterms])].sort((a, b) => a - b),
                                    level: levelNumber + 1
                                });
                            }
                            
                            usedIndices.add(term1.index);
                            usedIndices.add(term2.index);
                        }
                    });
                });
            }
            
            if (nextLevel.length === 0) break;
            
            allImplicants.push(...nextLevel);
            currentLevel = nextLevel;
            levelNumber++;
        }
        
        // 找到真正的 Prime Implicants
        const truePrimeImplicants = [];
        
        allImplicants.forEach(implicant => {
            let isPrime = true;
            
            // 檢查是否被其他更通用的 implicant 包含
            for (let other of allImplicants) {
                if (other !== implicant && this.isMoreGeneral(other.binary, implicant.binary)) {
                    // 檢查是否覆蓋相同的 minterms
                    const implicantMintermsInOriginal = implicant.minterms.filter(m => minterms.includes(m));
                    const otherMintermsInOriginal = other.minterms.filter(m => minterms.includes(m));
                    
                    if (otherMintermsInOriginal.length > 0 && 
                        implicantMintermsInOriginal.every(m => otherMintermsInOriginal.includes(m))) {
                        isPrime = false;
                        break;
                    }
                }
            }
            
            if (isPrime) {
                const coveredMinterms = implicant.minterms.filter(m => minterms.includes(m));
                if (coveredMinterms.length > 0) {
                    truePrimeImplicants.push({
                        pattern: implicant.binary,
                        minterms: coveredMinterms
                    });
                }
            }
        });
        
        console.log(`生成了 ${truePrimeImplicants.length} 個 Prime Implicants`);
        truePrimeImplicants.forEach((pi, index) => {
            console.log(`PI${index+1}: ${pi.pattern} → 覆蓋 m${pi.minterms.join(',m')}`);
        });
        
        return truePrimeImplicants;
    }

    /**
     * 將pattern轉換為minterms
     */
    convertPatternToMinterms(pattern) {
        const minterms = [];
        const numVars = pattern.length;
        
        // 計算所有可能的組合
        const dontCarePositions = [];
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '-') {
                dontCarePositions.push(i);
            }
        }
        
        const numCombinations = Math.pow(2, dontCarePositions.length);
        
        for (let combo = 0; combo < numCombinations; combo++) {
            let binaryStr = pattern;
            
            // 替換don't care位置
            for (let i = 0; i < dontCarePositions.length; i++) {
                const pos = dontCarePositions[i];
                const bit = (combo >> i) & 1;
                binaryStr = binaryStr.substring(0, pos) + bit + binaryStr.substring(pos + 1);
            }
            
            // 計算decimal值
            const decimalValue = parseInt(binaryStr, 2);
            minterms.push(decimalValue);
        }
        
        return minterms.sort((a, b) => a - b);
    }

    /**
     * 計算pattern的成本（符號數量+1）
     */
    calculateCost(pattern) {
        let literalCount = 0;
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] !== '-') {
                literalCount++;
            }
        }
        // 正確的成本計算：
        // 1個literal: cost = 1 (例如：y 的成本為 1)
        // 多個literals: cost = literal_count + 1 (例如：x'z' 有2個符號，成本為 2 + 1 = 3)
        if (literalCount === 1) {
            return 1;
        } else {
            return literalCount + 1;
        }
    }

    /**
     * 建立覆蓋表
     */
    buildCoverageTable() {
        this.coverageTable = {};
        
        this.minterms.forEach(minterm => {
            this.coverageTable[minterm] = [];
            
            this.primeImplicants.forEach((pi, index) => {
                if (pi.minterms.includes(minterm)) {
                    this.coverageTable[minterm].push(index);
                }
            });
        });
        
        return this.coverageTable;
    }

    /**
     * 找到Essential Prime Implicants
     */
    findEssentialPIs() {
        this.essentialPIs = [];
        const usedMinterms = new Set();
        
        this.minterms.forEach(minterm => {
            const coveringPIs = this.coverageTable[minterm];
            if (coveringPIs.length === 1) {
                const piIndex = coveringPIs[0];
                if (!this.essentialPIs.includes(piIndex)) {
                    this.essentialPIs.push(piIndex);
                    // 標記這個PI覆蓋的所有minterms
                    this.primeImplicants[piIndex].minterms.forEach(m => {
                        if (this.minterms.includes(m)) {
                            usedMinterms.add(m);
                        }
                    });
                }
            }
        });
        
        return {
            essentialPIs: this.essentialPIs,
            coveredMinterms: Array.from(usedMinterms)
        };
    }

    /**
     * 生成Quine-McCluskey Prime Implicants
     */
    generateQuineMcCluskeyPIs(minterms, numVars, dontCares = []) {
        console.log(`生成PI: minterms=[${minterms.join(',')}], numVars=${numVars}, dontCares=[${dontCares.join(',')}]`);
        
        // 確保所有項都是數字
        const allTerms = [...minterms, ...dontCares].map(term => parseInt(term, 10));
        const uniqueTerms = [...new Set(allTerms)].filter(term => !isNaN(term));
        
        // 轉換為二進制表示，作為第0層
        let currentLevel = uniqueTerms.map(term => {
            const binary = term.toString(2).padStart(numVars, '0');
            console.log(`轉換 m${term} → ${binary}`);
            return {
                binary: binary,
                minterms: [term],
                level: 0
            };
        });
        
        // 保存所有層級的implicants
        const allLevels = [currentLevel.slice()]; // 第0層：所有原始minterms
        let levelNumber = 0;
        
        // 逐層生成更高級的implicants
        while (currentLevel.length > 1) {
            const nextLevel = [];
            const usedIndices = new Set();
            
            // 按二進制中1的數量分組
            const groups = {};
            currentLevel.forEach((term, index) => {
                const ones = (term.binary.match(/1/g) || []).length;
                if (!groups[ones]) groups[ones] = [];
                groups[ones].push({...term, index});
            });
            
            // 嘗試組合相鄰組
            const groupKeys = Object.keys(groups).map(Number).sort((a, b) => a - b);
            
            for (let i = 0; i < groupKeys.length - 1; i++) {
                const group1 = groups[groupKeys[i]];
                const group2 = groups[groupKeys[i + 1]];
                
                group1.forEach(term1 => {
                    group2.forEach(term2 => {
                        const combinedResult = this.combineBinaryTerms(term1.binary, term2.binary);
                        if (combinedResult) {
                            // 檢查是否已經存在相同的組合
                            const existingTerm = nextLevel.find(t => t.binary === combinedResult);
                            if (!existingTerm) {
                                nextLevel.push({
                                    binary: combinedResult,
                                    minterms: [...new Set([...term1.minterms, ...term2.minterms])].sort((a, b) => a - b),
                                    level: levelNumber + 1
                                });
                            }
                            usedIndices.add(term1.index);
                            usedIndices.add(term2.index);
                        }
                    });
                });
            }
            
            if (nextLevel.length === 0) break;
            
            levelNumber++;
            allLevels.push(nextLevel.slice());
            currentLevel = nextLevel;
        }
        
        console.log(`生成了 ${allLevels.length} 層implicants`);
        allLevels.forEach((level, i) => {
            console.log(`第 ${i} 層: ${level.length} 個implicants`);
        });
        
        // 所有層級的所有implicants都作為PI返回（按照您的要求）
        const allImplicants = allLevels.flat();
        
        // 轉換為最終格式，只保留包含實際minterms的implicants
        const primeImplicants = allImplicants
            .map(implicant => {
                const coveredMinterms = implicant.minterms.filter(m => minterms.includes(m));
                return {
                    pattern: implicant.binary,
                    minterms: coveredMinterms,
                    level: implicant.level
                };
            })
            .filter(pi => pi.minterms.length > 0);
        
        // 按照層級和pattern排序
        primeImplicants.sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return a.pattern.localeCompare(b.pattern);
        });
        
        console.log(`生成了所有 ${primeImplicants.length} 個implicants:`, primeImplicants);
        return primeImplicants;
    }

    /**
     * 找出真正的Prime Implicants
     * 一個implicant是PI，如果它沒有被任何其他更大的implicant完全包含
     */
    findTruePrimeImplicants(allImplicants, minterms) {
        // 按照用戶要求：所有生成的implicants都視為PI，包括原始minterms
        const primeImplicants = [];
        
        allImplicants.forEach(implicant => {
            // 只考慮包含實際minterms的implicants
            const coveredMinterms = implicant.minterms.filter(m => minterms.includes(m));
            if (coveredMinterms.length > 0) {
                primeImplicants.push({
                    pattern: implicant.pattern || implicant.binary, // 兼容兩種屬性名
                    minterms: coveredMinterms
                });
            }
        });
        
        return primeImplicants;
    }

    /**
     * 檢查pattern1是否比pattern2更通用（包含更多的'-'）
     */
    isMoreGeneral(pattern1, pattern2) {
        if (pattern1.length !== pattern2.length) return false;
        
        let moreGeneral = false;
        for (let i = 0; i < pattern1.length; i++) {
            if (pattern1[i] === '-' && pattern2[i] !== '-') {
                moreGeneral = true;
            } else if (pattern1[i] !== '-' && pattern2[i] === '-') {
                return false;
            } else if (pattern1[i] !== pattern2[i]) {
                return false;
            }
        }
        
        return moreGeneral;
    }

    /**
     * 組合兩個二進制項
     */
    combineBinaryTerms(bin1, bin2) {
        if (bin1.length !== bin2.length) return null;
        
        let differences = 0;
        let result = '';
        
        for (let i = 0; i < bin1.length; i++) {
            if (bin1[i] !== bin2[i]) {
                differences++;
                if (differences > 1) return null;
                result += '-';
            } else {
                result += bin1[i];
            }
        }
        
        return differences === 1 ? result : null;
    }

    /**
     * 將pattern轉換為代數表達式
     */
    convertPatternToAlgebraic(pattern) {
        let algebraic = '';
        
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '1') {
                algebraic += this.variables[i] || `X${i}`;
            } else if (pattern[i] === '0') {
                algebraic += (this.variables[i] || `X${i}`) + "'";
            }
        }
        
        return algebraic || '1';
    }

    /**
     * 執行多輸出最佳化
     */
    executeMultipleOutput(mintermsByFunction, numVars, dontCares = []) {
        console.log('🚀 開始多輸出優化分析');
        console.log('輸入函數:', mintermsByFunction);
        
        // 設定變數
        if (!this.variables || this.variables.length === 0) {
            this.variables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, numVars);
        }
        
        this.calculationSteps = [];
        
        // 規範化輸入格式
        const normalizedMinterms = {};
        Object.entries(mintermsByFunction).forEach(([funcName, minterms]) => {
            let mintermsArray;
            if (Array.isArray(minterms)) {
                mintermsArray = minterms.map(m => parseInt(m, 10)).filter(m => !isNaN(m));
            } else if (typeof minterms === 'object' && minterms.minterms) {
                mintermsArray = (minterms.minterms || []).map(m => parseInt(m, 10)).filter(m => !isNaN(m));
            } else if (typeof minterms === 'string') {
                mintermsArray = minterms.split(',').map(m => parseInt(m.trim(), 10)).filter(m => !isNaN(m));
            } else {
                console.error(`錯誤: ${funcName} 的 minterms 格式不正確:`, minterms);
                mintermsArray = [];
            }
            normalizedMinterms[funcName] = mintermsArray;
            console.log(`${funcName} 規範化後的minterms:`, mintermsArray);
        });

        // 檢測函數數量，決定PI生成策略
        const functionCount = Object.keys(normalizedMinterms).length;
        console.log(`檢測到 ${functionCount} 個函數`);
        
        // 步驟1: 為每個函數生成Prime Implicants
        const functionPIs = {};
        const allPIsByPattern = new Map();
        
        this.calculationSteps.push({
            step: 1,
            title: "🔧 為每個函數分別生成Prime Implicants",
            description: functionCount === 1 ? 
                "使用Quine-McCluskey演算法只生成真正的Prime Implicants" : 
                "使用Quine-McCluskey演算法生成所有Implicants",
            details: []
        });
        
        Object.entries(normalizedMinterms).forEach(([funcName, mintermsArray]) => {
            console.log(`\n為 ${funcName} 生成PI，minterms: [${mintermsArray.join(',')}]`);
            
            let pis;
            if (functionCount === 1) {
                // 單函數模式：只生成真正的Prime Implicants（迭代合成後的產物）
                console.log('🎯 單函數模式：只生成Prime Implicants（迭代合成後的產物）');
                pis = this.generateOnlyTruePrimeImplicants(mintermsArray, numVars, dontCares);
            } else {
                // 多函數模式：生成所有Implicants（迭代合成前後都有的產物）
                console.log('🔧 多函數模式：生成所有Implicants（迭代合成前後都有的產物）');
                const allImplicants = this.generateQuineMcCluskeyPIs(mintermsArray, numVars, dontCares);
                pis = this.findTruePrimeImplicants(allImplicants, mintermsArray);
            }
            
            functionPIs[funcName] = pis;
            
            this.calculationSteps[0].details.push(`${funcName} = Σm(${mintermsArray.join(',')})`);
            this.calculationSteps[0].details.push(`生成的PIs:`);
            
            pis.forEach((pi, index) => {
                const algebraic = this.convertPatternToAlgebraic(pi.pattern);
                console.log(`${funcName}-PI${index+1}: pattern="${pi.pattern}", algebraic="${algebraic}", minterms=[${pi.minterms.join(',')}]`);
                this.calculationSteps[0].details.push(`  ${funcName}-PI${index+1}: ${pi.pattern} → ${algebraic} (覆蓋: m${pi.minterms.join(',m')})`);
                
                const key = pi.pattern;
                if (!allPIsByPattern.has(key)) {
                    allPIsByPattern.set(key, {
                        pattern: pi.pattern,
                        minterms: pi.minterms.slice(),
                        usedBy: [],
                        cost: this.calculateCost(pi.pattern)
                    });
                }
                
                allPIsByPattern.get(key).usedBy.push(funcName);
            });
            
                         this.calculationSteps[0].details.push('');
        });

        // 處理單函數情況
        if (functionCount === 1) {
            // 單函數模式：直接使用標準Patrick Method
            const [funcName, mintermsArray] = Object.entries(normalizedMinterms)[0];
            const pis = functionPIs[funcName];
            
            // 設置基本屬性
            this.minterms = mintermsArray;
            this.primeImplicants = pis.map((pi, index) => ({
                name: `PI${index + 1}`,
                pattern: pi.pattern,
                minterms: pi.minterms,
                cost: this.calculateCost(pi.pattern),
                algebraic: this.convertPatternToAlgebraic(pi.pattern)
            }));
            
            // 建立覆蓋表
            console.log('單函數模式：建立覆蓋表...');
            console.log('minterms:', this.minterms);
            console.log('primeImplicants:', this.primeImplicants);
            this.buildCoverageTable();
            console.log('覆蓋表:', this.coverageTable);
            
            // 找到 Essential PIs
            console.log('單函數模式：尋找 Essential PIs...');
            const { essentialPIs, coveredMinterms } = this.findEssentialPIs();
            console.log('Essential PIs:', essentialPIs);
            console.log('已覆蓋的minterms:', coveredMinterms);
            
            this.calculationSteps.push({
                step: 2,
                title: "📊 覆蓋表分析與 Essential Prime Implicants",
                description: "分析各 PI 對 minterms 的覆蓋情況",
                details: [
                    `Essential PIs: ${essentialPIs.length > 0 ? essentialPIs.map(i => `PI${i+1}`).join(', ') : '無'}`,
                    `已覆蓋的minterms: [${coveredMinterms.join(',')}]`
                ]
            });
            
            // 使用 Patrick Method 找到最小覆蓋
            const remainingMinterms = mintermsArray.filter(m => !coveredMinterms.includes(m));
            console.log('剩餘未覆蓋的minterms:', remainingMinterms);
            let minimalCovers = [];
            
            if (remainingMinterms.length > 0) {
                console.log('需要找最小覆蓋...');
                const availablePIs = this.primeImplicants.filter((pi, index) => !essentialPIs.includes(index));
                console.log('可用PIs:', availablePIs);
                minimalCovers = this.findAllMinimalCovers(remainingMinterms, availablePIs);
                console.log('找到的最小覆蓋:', minimalCovers);
            } else {
                console.log('所有minterms都已被Essential PIs覆蓋');
            }
            
            // 組合 Essential PIs 和最小覆蓋
            console.log('組合 Essential PIs 和最小覆蓋...');
            const finalSolutions = [];
            if (minimalCovers.length === 0) {
                console.log('使用 Essential PIs 作為解');
                const essentialSolution = essentialPIs.map(index => this.primeImplicants[index]);
                console.log('Essential solution:', essentialSolution);
                finalSolutions.push(essentialSolution);
            } else {
                console.log('組合 Essential PIs 和最小覆蓋');
                minimalCovers.forEach(cover => {
                    const solution = [
                        ...essentialPIs.map(index => this.primeImplicants[index]),
                        ...cover.pis
                    ];
                    finalSolutions.push(solution);
                });
            }
            
            console.log('最終解數量:', finalSolutions.length);
            console.log('最終解:', finalSolutions);
            
            // 轉換為返回格式 - 保存所有最佳解
            const result = {};
            const allSolutions = [];
            
            if (finalSolutions.length > 0) {
                console.log('找到的所有解:', finalSolutions);
                
                // 轉換所有解決方案
                finalSolutions.forEach((solution, index) => {
                    const convertedSolution = {
                        pis: solution.map(pi => ({
                            pattern: pi.pattern,
                            algebraic: this.convertPatternToAlgebraic(pi.pattern),
                            minterms: pi.minterms,
                            cost: this.calculateCost(pi.pattern)
                        })),
                        expression: solution.map(pi => this.convertPatternToAlgebraic(pi.pattern)).join(' + '),
                        cost: solution.reduce((sum, pi) => sum + this.calculateCost(pi.pattern), 0)
                    };
                    allSolutions.push(convertedSolution);
                    console.log(`解決方案 ${index + 1}:`, convertedSolution);
                });
                
                // 主要結果使用第一個解
                result[funcName] = allSolutions[0];
                console.log('主要結果:', result[funcName]);
            } else {
                console.error('沒有找到任何解決方案！');
            }
            
            this.calculationSteps.push({
                step: 3,
                title: "✅ 最終結果",
                description: "單函數優化完成",
                details: [`${funcName} = ${result[funcName]?.expression || '無解'}`]
            });
            
            // 生成統一的解決方案格式（為前端顯示）
            const formatSingleSolution = (solution) => {
                const expressions = [`${funcName} = ${solution.expression}`];
                const usedPIPatterns = solution.pis.map(pi => pi.pattern).sort();
                return {
                    expressions: expressions,
                    usedPIPatterns: usedPIPatterns,
                    sharedCost: solution.cost
                };
            };

            const mainSolutionFormatted = result[funcName] ? 
                formatSingleSolution(result[funcName]) : null;

            // 格式化所有解決方案
            const allFormattedSolutions = allSolutions.map(solution => formatSingleSolution(solution));

            // 調試輸出
            console.log('🎨 單函數格式化解決方案生成:');
            console.log('mainSolutionFormatted:', mainSolutionFormatted);
            console.log('allFormattedSolutions:', allFormattedSolutions);

            // 包裝成前端期望的格式
            return {
                success: true,
                solutions: result,
                allSolutions: allSolutions,  // 添加所有解決方案
                functionName: funcName,      // 添加函數名稱
                calculationSteps: this.calculationSteps,
                totalIndividualCost: result[funcName]?.cost || 0,
                sharedOptimizedCost: result[funcName]?.cost || 0,
                savings: 0,
                sharedPIs: [],
                // 新增：統一格式化的解決方案顯示
                formattedSolution: mainSolutionFormatted,
                allFormattedSolutions: allFormattedSolutions
            };
        }

        // 處理多函數情況
        // 步驟2: 分析PI共享情況
        this.calculationSteps.push({
            step: 2,
            title: "📊 分析Prime Implicant共享情況",
            description: "識別哪些PI可以被多個函數共享",
            details: []
        });
        
        const sharedPIs = [];
        const exclusivePIs = [];
        let piCounter = 1;
        
        allPIsByPattern.forEach((piInfo, pattern) => {
            const algebraic = this.convertPatternToAlgebraic(pattern);
            const usedByStr = piInfo.usedBy.join(', ');
            
            if (piInfo.usedBy.length > 1) {
                sharedPIs.push(piInfo);
                this.calculationSteps[1].details.push(`✅ 共享PI${piCounter}: ${pattern} → ${algebraic} (用於: ${usedByStr}, 成本: ${piInfo.cost})`);
            } else {
                exclusivePIs.push(piInfo);
                this.calculationSteps[1].details.push(`⚪ 專用PI${piCounter}: ${pattern} → ${algebraic} (用於: ${usedByStr}, 成本: ${piInfo.cost})`);
            }
            piCounter++;
        });
        
        this.calculationSteps[1].details.push('');
        this.calculationSteps[1].details.push(`共享PI數量: ${sharedPIs.length}, 專用PI數量: ${exclusivePIs.length}`);

        // 步驟3: 使用聯合Patrick Method解決多函數覆蓋問題
        this.calculationSteps.push({
            step: 3,
            title: "🎯 使用聯合Patrick Method解決多函數覆蓋問題",
            description: "一次性計算所有函數的最小覆蓋，考慮PI共享",
            details: []
        });

        // 設置PI引用
        this.setAllPIsByPattern(allPIsByPattern);
        
        // 建立聯合覆蓋表
        const jointCoverageTable = this.buildJointCoverageTable(normalizedMinterms, allPIsByPattern);
        
            // 使用聯合Patrick Method找到最佳解
    const jointSolutions = this.solveJointPatrickMethod(jointCoverageTable, allPIsByPattern, normalizedMinterms);
    
    // 生成系統解 - 處理所有最佳解 (加入去重機制)
    const allSystemSolutions = [];
    const seenSolutions = new Set(); // 用於去重
        
        jointSolutions.forEach((jointSolution, solutionIndex) => {
            const systemSolution = {};
            const usedPIs = new Set(); // 追蹤已使用的PI
            
            Object.entries(normalizedMinterms).forEach(([funcName, minterms]) => {
                const functionPIs = [];
                
                jointSolution.forEach(pattern => {
                    const piInfo = allPIsByPattern.get(pattern);
                    if (piInfo && piInfo.usedBy.includes(funcName)) {
                        const coveredMinterms = piInfo.minterms.filter(m => minterms.includes(m));
                        if (coveredMinterms.length > 0) {
                            functionPIs.push({
                                pattern: pattern,
                                algebraic: this.convertPatternToAlgebraic(pattern),
                                minterms: coveredMinterms,
                                cost: piInfo.cost
                            });
                        }
                    }
                });
                
                if (functionPIs.length > 0) {
                    // 🔍 嘗試使用保存的Stage 2結果
                    const stage2Key = [...jointSolution].sort().join(',');
                    let optimizedPIs;
                    
                    if (this._stage2Cache && this._stage2Cache.has(stage2Key)) {
                        console.log(`💾 使用緩存的Stage 2結果 for ${funcName}`);
                        optimizedPIs = this._stage2Cache.get(stage2Key)[funcName] || functionPIs;
                    } else {
                        console.log(`🔄 重新計算Stage 2結果 for ${funcName}`);
                        optimizedPIs = this.removeRedundantPIsForStage2(functionPIs, minterms);
                    }
                    
                    // 確保optimizedPIs有algebraic屬性
                    optimizedPIs = optimizedPIs.map(pi => ({
                        ...pi,
                        algebraic: pi.algebraic || this.convertPatternToAlgebraic(pi.pattern)
                    }));
                    
                    optimizedPIs.forEach(pi => {
                        usedPIs.add(pi.pattern);
                    });
                    
                    systemSolution[funcName] = {
                        pis: optimizedPIs,
                        expression: optimizedPIs.map(pi => pi.algebraic).join(' + '),
                        cost: optimizedPIs.reduce((sum, pi) => sum + pi.cost, 0) // 函數個別成本
                    };
                    
                    console.log(`${funcName} 最終表達式: ${systemSolution[funcName].expression}`);
                }
            });
            
            // 計算真正的Stage 3共享成本並獲取Stage 2優化後的PI組合
            const originalLog = console.log;
            console.log = () => {}; // 暫時禁用
            const stage3Cost = this.calculateThreeStagesCost(jointSolution, normalizedMinterms, allPIsByPattern);
            console.log = originalLog; // 恢復
            
            // 獲取Stage 2優化後的實際PI組合
            const stage2OptimizedPIs = new Set();
            Object.entries(normalizedMinterms).forEach(([funcName, minterms]) => {
                const functionPIs = [];
                jointSolution.forEach(pattern => {
                    const piInfo = allPIsByPattern.get(pattern);
                    if (piInfo && piInfo.usedBy.includes(funcName)) {
                        const coveredMinterms = piInfo.minterms.filter(m => minterms.includes(m));
                        if (coveredMinterms.length > 0) {
                            functionPIs.push({
                                pattern: pattern,
                                minterms: coveredMinterms,
                                cost: piInfo.cost
                            });
                        }
                    }
                });
                
                if (functionPIs.length > 0) {
                    // 進行Stage 2冗餘移除
                    const optimizedPIs = this.removeRedundantPIsForStage2(functionPIs, minterms);
                    optimizedPIs.forEach(pi => {
                        stage2OptimizedPIs.add(pi.pattern);
                    });
                }
            });
            
            systemSolution._sharedOptimizedCost = stage3Cost;
            systemSolution._usedPIPatterns = Array.from(usedPIs);
            systemSolution._stage2OptimizedPIs = Array.from(stage2OptimizedPIs).sort();
            
            // 去重：根據Stage 2優化後的PI組合創建唯一標識
            const stage2PIKey = systemSolution._stage2OptimizedPIs.join(',');
            
            if (!seenSolutions.has(stage2PIKey)) {
                seenSolutions.add(stage2PIKey);
                allSystemSolutions.push(systemSolution);
            }
        });
        
        // 使用第一個解作為主要解，但只保留函數部分
        let solutions = {};
        let sharedOptimizedCost = 0;
        let totalIndividualCost = 0;
        
        if (allSystemSolutions.length > 0) {
            const firstSystemSolution = allSystemSolutions[0];
            
            // 只提取函數部分，排除內部屬性
            Object.entries(firstSystemSolution).forEach(([key, value]) => {
                if (!key.startsWith('_')) {
                    solutions[key] = value;
                }
            });
            
            // 獲取內部屬性
            sharedOptimizedCost = firstSystemSolution._sharedOptimizedCost || 0;
            
            // 計算個別優化總成本
            totalIndividualCost = Object.values(solutions).reduce((sum, sol) => sum + sol.cost, 0);
        }
        
        const savings = totalIndividualCost - sharedOptimizedCost;
        
        // 準備所有解的詳細信息
        const allSolutionsDetails = allSystemSolutions.map((systemSol, index) => {
            const solutionSummary = {
                solutionNumber: index + 1,
                usedPIPatterns: systemSol._stage2OptimizedPIs || systemSol._usedPIPatterns,
                sharedCost: systemSol._sharedOptimizedCost,
                functions: {}
            };
            
            Object.entries(systemSol).forEach(([funcName, funcSol]) => {
                if (!funcName.startsWith('_')) {
                    solutionSummary.functions[funcName] = {
                        expression: funcSol.expression,
                        pis: funcSol.pis.map(pi => pi.pattern),
                        cost: funcSol.cost
                    };
                }
            });
            
            return solutionSummary;
        });
        
        // 添加多解詳情到計算步驟
        if (allSystemSolutions.length > 1) {
            this.calculationSteps[2].details.push('');
            this.calculationSteps[2].details.push(`🔍 找到 ${allSystemSolutions.length} 個最佳解：`);
            allSolutionsDetails.forEach((sol, index) => {
                this.calculationSteps[2].details.push(`解 ${index + 1}:`);
                this.calculationSteps[2].details.push(`  使用PI: ${sol.usedPIPatterns.join(', ')}`);
                this.calculationSteps[2].details.push(`  共享成本: ${sol.sharedCost}`);
                Object.entries(sol.functions).forEach(([funcName, funcData]) => {
                    this.calculationSteps[2].details.push(`  ${funcName}: ${funcData.expression} (PI: ${funcData.pis.join(', ')})`);
                });
                this.calculationSteps[2].details.push('');
            });
        }
        
        // 生成統一的解決方案格式（為前端顯示）
        const formatSolution = (systemSol) => {
            const functionExpressions = [];
            const allUsedPIs = new Set();
            
            // 按函數名稱排序
            const sortedFunctions = Object.entries(systemSol)
                .filter(([key]) => !key.startsWith('_'))
                .sort(([a], [b]) => a.localeCompare(b));
            
            sortedFunctions.forEach(([funcName, funcData]) => {
                functionExpressions.push(`${funcName} = ${funcData.expression}`);
                funcData.pis.forEach(pi => allUsedPIs.add(pi.pattern));
            });
            
            return {
                expressions: functionExpressions,
                usedPIPatterns: systemSol._stage2OptimizedPIs || Array.from(allUsedPIs).sort(),
                sharedCost: systemSol._sharedOptimizedCost || 0
            };
        };

        // 格式化主要解決方案
        const mainSolutionFormatted = allSystemSolutions.length > 0 ? 
            formatSolution(allSystemSolutions[0]) : null;
        
        // 格式化所有解決方案
        const allFormattedSolutions = allSystemSolutions.map((sol, index) => ({
            solutionNumber: index + 1,
            ...formatSolution(sol)
        }));

        // 調試輸出
        console.log('🎨 格式化解決方案生成:');
        console.log('mainSolutionFormatted:', mainSolutionFormatted);
        console.log('allFormattedSolutions:', allFormattedSolutions);

        // 包裝成前端期望的格式
        return {
            success: true,
            solutions: solutions,
            calculationSteps: this.calculationSteps,
            totalIndividualCost: totalIndividualCost,
            sharedOptimizedCost: sharedOptimizedCost,
            savings: savings,
            sharedPIs: Array.from(allPIsByPattern.entries())
                .filter(([, piInfo]) => piInfo.usedBy.length > 1)
                .map(([pattern, piInfo]) => ({
                    pattern: pattern,
                    algebraic: this.convertPatternToAlgebraic(pattern),
                    usedBy: piInfo.usedBy,
                    cost: piInfo.cost
                })),
            allSolutions: allSolutionsDetails.length > 1 ? allSolutionsDetails : undefined,
            // 新增：統一格式化的解決方案顯示
            formattedSolution: mainSolutionFormatted,
            allFormattedSolutions: allFormattedSolutions.length > 0 ? allFormattedSolutions : undefined
        };
    }

    /**
     * 執行單函數優化
     */
    executeSingleFunctionOptimization(normalizedMinterms, numVars, dontCares = []) {
        const [funcName, mintermsArray] = Object.entries(normalizedMinterms)[0];
        console.log(`單函數優化：${funcName} = Σm(${mintermsArray.join(',')})`);
        
        this.calculationSteps.push({
            step: 1,
            title: "🎯 單函數 Prime Implicants 生成",
            description: "使用 Quine-McCluskey 算法生成真正的 Prime Implicants",
            details: [`${funcName} = Σm(${mintermsArray.join(',')})`]
        });
        
        // 生成真正的 Prime Implicants（使用 web 版本的方法）
        const truePIs = this.generateTruePrimeImplicantsForSingleFunction(mintermsArray, numVars, dontCares);
        
        this.calculationSteps[0].details.push(`生成的 Prime Implicants:`);
        truePIs.forEach((pi, index) => {
            const algebraic = this.convertPatternToAlgebraic(pi.pattern);
            this.calculationSteps[0].details.push(`  PI${index+1}: ${pi.pattern} → ${algebraic} (覆蓋: m${pi.minterms.join(',m')})`);
        });
        
        // 設置基本屬性
        this.minterms = mintermsArray;
        this.primeImplicants = truePIs.map((pi, index) => ({
            name: `PI${index + 1}`,
            pattern: pi.pattern,
            minterms: pi.minterms
        }));
        
        // 建立覆蓋表
        console.log('建立覆蓋表...');
        this.buildCoverageTable();
        console.log('覆蓋表:', this.coverageTable);
        
        // 找到 Essential PIs
        console.log('尋找 Essential PIs...');
        const { essentialPIs, coveredMinterms } = this.findEssentialPIs();
        console.log('Essential PIs:', essentialPIs);
        console.log('已覆蓋的minterms:', coveredMinterms);
        
        this.calculationSteps.push({
            step: 2,
            title: "📊 覆蓋表分析與 Essential Prime Implicants",
            description: "分析各 PI 對 minterms 的覆蓋情況",
            details: [
                `Essential PIs: ${essentialPIs.length > 0 ? essentialPIs.map(i => `PI${i+1}`).join(', ') : '無'}`,
                `已覆蓋的minterms: [${coveredMinterms.join(',')}]`
            ]
        });
        
        // 使用 Patrick Method 找到最小覆蓋
        const remainingMinterms = mintermsArray.filter(m => !coveredMinterms.includes(m));
        console.log('剩餘未覆蓋的minterms:', remainingMinterms);
        let minimalCovers = [];
        
        if (remainingMinterms.length > 0) {
            console.log('尋找最小覆蓋...');
            const availablePIs = this.primeImplicants.filter((pi, index) => !essentialPIs.includes(index));
            console.log('可用PIs數量:', availablePIs.length);
            try {
                minimalCovers = this.findAllMinimalCovers(remainingMinterms, availablePIs);
                console.log('找到的最小覆蓋數量:', minimalCovers.length);
            } catch (error) {
                console.error('尋找最小覆蓋時發生錯誤:', error);
                throw new Error(`Patrick Method執行失敗: ${error.message}`);
            }
        } else {
            console.log('所有minterms都已被Essential PIs覆蓋');
        }
        
        // 組合 Essential PIs 和最小覆蓋
        console.log('組合 Essential PIs 和最小覆蓋...');
        const finalSolutions = [];
        
        try {
            if (minimalCovers.length === 0) {
                // 只需要 Essential PIs
                console.log('使用 Essential PIs 作為最終解');
                const essentialSolution = essentialPIs.map(index => this.primeImplicants[index]);
                finalSolutions.push(essentialSolution);
            } else {
                // 每個最小覆蓋都加上 Essential PIs
                console.log(`組合 ${minimalCovers.length} 個最小覆蓋與 Essential PIs`);
                minimalCovers.forEach(cover => {
                    const solution = [
                        ...essentialPIs.map(index => this.primeImplicants[index]),
                        ...cover
                    ];
                    finalSolutions.push(solution);
                });
            }
            
            console.log(`生成了 ${finalSolutions.length} 個最終解`);
            
            // 轉換為返回格式
            const result = {};
            if (finalSolutions.length > 0) {
                const bestSolution = finalSolutions[0];
                console.log('最佳解包含的PIs:', bestSolution.map(pi => pi.pattern));
                
                result[funcName] = {
                    pis: bestSolution.map(pi => ({
                        pattern: pi.pattern,
                        algebraic: this.convertPatternToAlgebraic(pi.pattern),
                        minterms: pi.minterms,
                        cost: this.calculateCost(pi.pattern)
                    })),
                    expression: bestSolution.map(pi => this.convertPatternToAlgebraic(pi.pattern)).join(' + '),
                    cost: bestSolution.reduce((sum, pi) => sum + this.calculateCost(pi.pattern), 0)
                };
                
                console.log('最終表達式:', result[funcName].expression);
                console.log('總成本:', result[funcName].cost);
            } else {
                console.error('無法生成有效解');
                throw new Error('無法生成有效的最小覆蓋解');
            }
            
            this.calculationSteps.push({
                step: 3,
                title: "✅ 最終結果",
                description: "單函數優化完成",
                details: [`${funcName} = ${result[funcName]?.expression || '無解'}`]
            });
            
            this.calculationSteps.push({
                step: 3,
                title: "✅ 最終結果", 
                description: "單函數優化完成",
                details: [`${funcName} = ${result[funcName]?.expression || '無解'}`]
            });
            
            console.log('單函數優化完成');
            return result;
            
        } catch (error) {
            console.error('組合最終解時發生錯誤:', error);
            this.calculationSteps.push({
                step: 3,
                title: "❌ 錯誤",
                description: "單函數優化失敗",
                details: [error.message]
            });
            throw new Error(`單函數優化失敗: ${error.message}`);
        }
    }

    /**
     * 執行多函數優化（原本的邏輯）
     */
    executeMultipleFunctionOptimization(normalizedMinterms, numVars, dontCares = []) {
        // 步驟1: 為每個函數生成Prime Implicants
        const functionPIs = {};
        const allPIsByPattern = new Map();
        
        this.calculationSteps.push({
            step: 1,
            title: "🔧 為每個函數分別生成Prime Implicants",
            description: "使用Quine-McCluskey演算法為每個函數獨立生成PI",
            details: []
        });
        
        Object.entries(normalizedMinterms).forEach(([funcName, mintermsArray]) => {
            console.log(`\n為 ${funcName} 生成PI，minterms: [${mintermsArray.join(',')}]`);
            
            // 多函數模式：生成所有可能的 Implicants（包括非 Prime）
            const allImplicants = this.generateQuineMcCluskeyPIs(mintermsArray, numVars, dontCares);
            const pis = this.findTruePrimeImplicants(allImplicants, mintermsArray);
            functionPIs[funcName] = pis;
            
            this.calculationSteps[0].details.push(`${funcName} = Σm(${mintermsArray.join(',')})`);
            this.calculationSteps[0].details.push(`生成的PIs:`);
            
            pis.forEach((pi, index) => {
                const algebraic = this.convertPatternToAlgebraic(pi.pattern);
                console.log(`${funcName}-PI${index+1}: pattern="${pi.pattern}", algebraic="${algebraic}", minterms=[${pi.minterms.join(',')}]`);
                this.calculationSteps[0].details.push(`  ${funcName}-PI${index+1}: ${pi.pattern} → ${algebraic} (覆蓋: m${pi.minterms.join(',m')})`);
                
                const key = pi.pattern;
                if (!allPIsByPattern.has(key)) {
                    allPIsByPattern.set(key, {
                        pattern: pi.pattern,
                        minterms: pi.minterms.slice(),
                        usedBy: [],
                        cost: this.calculateCost(pi.pattern)
                    });
                }
                
                allPIsByPattern.get(key).usedBy.push(funcName);
            });
            
            this.calculationSteps[0].details.push('');
        });

        // 步驟2: 分析PI共享情況
        this.calculationSteps.push({
            step: 2,
            title: "📊 分析Prime Implicant共享情況",
            description: "識別哪些PI可以被多個函數共享",
            details: []
        });
        
        const sharedPIs = [];
        const exclusivePIs = [];
        let piCounter = 1;
        
        allPIsByPattern.forEach((piInfo, pattern) => {
            const algebraic = this.convertPatternToAlgebraic(pattern);
            const usedByStr = piInfo.usedBy.join(', ');
            
            if (piInfo.usedBy.length > 1) {
                sharedPIs.push(piInfo);
                this.calculationSteps[1].details.push(`✅ 共享PI${piCounter}: ${pattern} → ${algebraic} (用於: ${usedByStr}, 成本: ${piInfo.cost})`);
            } else {
                exclusivePIs.push(piInfo);
                this.calculationSteps[1].details.push(`⚪ 專用PI${piCounter}: ${pattern} → ${algebraic} (用於: ${usedByStr}, 成本: ${piInfo.cost})`);
            }
            piCounter++;
        });
        
        this.calculationSteps[1].details.push('');
        this.calculationSteps[1].details.push(`共享PI數量: ${sharedPIs.length}, 專用PI數量: ${exclusivePIs.length}`);

        // 步驟3: 使用聯合Patrick Method解決多函數覆蓋問題
        this.calculationSteps.push({
            step: 3,
            title: "🎯 使用聯合Patrick Method解決多函數覆蓋問題",
            description: "一次性計算所有函數的最小覆蓋，考慮PI共享",
            details: []
        });

        // 設置PI引用
        this.setAllPIsByPattern(allPIsByPattern);
        
        // 建立聯合覆蓋表
        const jointCoverageTable = this.buildJointCoverageTable(normalizedMinterms, allPIsByPattern);
        
            // 使用聯合Patrick Method找到最佳解
    const jointSolutions = this.solveJointPatrickMethod(jointCoverageTable, allPIsByPattern, normalizedMinterms);
    
    // 生成系統解
    const systemSolutions = this.generateSystemSolutionsFromJoint(jointSolutions, normalizedMinterms);
        console.log(`🔍 systemSolutions數量: ${systemSolutions.length}`);
        console.log(`🔍 jointSolutions數量: ${jointSolutions.length}`);
        let solutions = {};
        
        // 如果系統解生成失敗，回退到基本解
        if (systemSolutions.length > 0) {
            console.log(`✅ 使用系統解路徑`);
        
            // 只提取函數部分，排除內部屬性
            const firstSystemSolution = systemSolutions[0];
            Object.entries(firstSystemSolution).forEach(([key, value]) => {
                if (!key.startsWith('_')) {
                    solutions[key] = value;
                }
            });
        } else if (jointSolutions.length > 0) {
            console.log(`⚠️ 使用回退路徑：手動構建解決方案`);
            // 手動構建解決方案
            const bestSolution = jointSolutions[0];
            Object.entries(normalizedMinterms).forEach(([funcName, minterms]) => {
                const functionPIs = [];
                
                bestSolution.forEach(pattern => {
                    const piInfo = allPIsByPattern.get(pattern);
                    if (piInfo && piInfo.usedBy.includes(funcName)) {
                        const coveredMinterms = piInfo.minterms.filter(m => minterms.includes(m));
                        if (coveredMinterms.length > 0) {
                            functionPIs.push({
                                pattern: pattern,
                                algebraic: this.convertPatternToAlgebraic(pattern),
                                minterms: coveredMinterms,
                                cost: piInfo.cost
                            });
                        }
                    }
                });
                
                if (functionPIs.length > 0) {
                    // 🔍 嘗試使用保存的Stage 2結果
                    const stage2Key = [...bestSolution].sort().join(',');
                    let optimizedPIs;
                    
                    if (this._stage2Cache && this._stage2Cache.has(stage2Key)) {
                        console.log(`💾 使用緩存的Stage 2結果 for ${funcName}`);
                        optimizedPIs = this._stage2Cache.get(stage2Key)[funcName] || [];
                    } else {
                        console.log(`🔄 重新計算Stage 2結果 for ${funcName}`);
                        optimizedPIs = this.removeRedundantPIsForStage2(functionPIs, minterms);
                    }
                    
                    solutions[funcName] = {
                        pis: optimizedPIs,
                        expression: optimizedPIs.map(pi => pi.algebraic).join(' + '),
                        cost: optimizedPIs.reduce((sum, pi) => sum + pi.cost, 0)
                    };
                    
                    console.log(`${funcName} 最終表達式: ${solutions[funcName].expression}`);
                }
            });
        }
        
        // 計算個別成本
        console.log('開始計算個別成本...');
        let totalIndividualCost = 0;
        Object.entries(normalizedMinterms).forEach(([funcName, minterms]) => {
            console.log(`計算 ${funcName} 的個別成本...`);
            const functionPIs = [];
            allPIsByPattern.forEach((piInfo, pattern) => {
                if (piInfo.usedBy.includes(funcName)) {
                    const coveredMinterms = piInfo.minterms.filter(m => minterms.includes(m));
                    if (coveredMinterms.length > 0) {
                        functionPIs.push({
                            pattern: pattern,
                            algebraic: this.convertPatternToAlgebraic(pattern),
                            minterms: coveredMinterms,
                            cost: piInfo.cost
                        });
                    }
                }
            });
            
            console.log(`${funcName} 可用PI數量: ${functionPIs.length}`);
            
            // 簡化個別成本計算，避免複雜的窮舉
            const individualCost = functionPIs.reduce((sum, pi) => sum + pi.cost, 0);
            totalIndividualCost += individualCost;
            console.log(`${funcName} 個別成本: ${individualCost}`);
        });
        console.log('個別成本計算完成');

        // 步驟4: 計算共享最佳化
        this.calculationSteps.push({
            step: 4,
            title: "⚡ 共享最佳化分析",
            description: "分析使用共享PI的成本效益",
            details: []
        });

        // 計算聯合Patrick Method的實際成本
        let jointMethodCost = 0;
        const piUsageCount = new Map();
        
        // 從聯合解中獲取使用的PI並計算實際成本
        if (jointSolutions.length > 0) {
            const usedPIs = jointSolutions[0]; // 取第一個最佳解
            usedPIs.forEach(pattern => {
                const piCost = allPIsByPattern.get(pattern).cost;
                jointMethodCost += piCost;
                
                // 統計PI使用次數（基於哪些函數使用了此PI）
                const piInfo = allPIsByPattern.get(pattern);
                piUsageCount.set(pattern, piInfo.usedBy.length);
            });
        }

        // 計算節省的成本：個別最佳化總成本 - 聯合最佳化成本
        const actualSavings = totalIndividualCost - jointMethodCost;

        this.calculationSteps[3].details.push(`個別最佳化總成本: ${totalIndividualCost}`);
        this.calculationSteps[3].details.push(`聯合Patrick Method成本: ${jointMethodCost}`);
        this.calculationSteps[3].details.push(`節省成本: ${actualSavings} (${((actualSavings/totalIndividualCost)*100).toFixed(1)}%)`);
        this.calculationSteps[3].details.push('');

        // 顯示PI使用統計
        this.calculationSteps[3].details.push('PI使用統計:');
        piUsageCount.forEach((count, pattern) => {
            const algebraic = this.convertPatternToAlgebraic(pattern);
            const piCost = allPIsByPattern.get(pattern).cost;
            const usedBy = allPIsByPattern.get(pattern).usedBy;
            this.calculationSteps[3].details.push(`  ${pattern} → ${algebraic} (成本: ${piCost}, 用於: ${usedBy.join(', ')})`);
        });

        if (sharedPIs.length > 0) {
            this.calculationSteps[3].details.push('');
            this.calculationSteps[3].details.push('共享的Prime Implicants:');
            sharedPIs.forEach(pi => {
                const algebraic = this.convertPatternToAlgebraic(pi.pattern);
                this.calculationSteps[3].details.push(`  ${pi.pattern} → ${algebraic} (${pi.usedBy.join(', ')})`);
            });
        }

        return {
            success: true,
            solutions: solutions,
            systemSolutions: systemSolutions,
            sharedPIs: sharedPIs,
            totalIndividualCost: totalIndividualCost,
            sharedOptimizedCost: jointMethodCost,
            savings: actualSavings,
            calculationSteps: this.calculationSteps,
            allPIs: Array.from(allPIsByPattern.values()),
            outputFunctions: normalizedMinterms
        };
    }

    /**
     * 找到最小覆蓋（窮舉所有最佳解）
     */
    findMinimalCover(targetMinterms, availablePIs) {
        const solutions = this.findAllMinimalCovers(targetMinterms, availablePIs);
        
        if (solutions.length === 0) {
            return {
                pis: [],
                cost: 0,
                expression: '0',
                allSolutions: []
            };
        }

        // 返回第一個解，但保留所有解的信息
        const firstSolution = solutions[0];
        return {
            pis: firstSolution.pis,
            cost: firstSolution.cost,
            expression: firstSolution.expression,
            allSolutions: solutions
        };
    }

    /**
     * 找到所有最小成本覆蓋解
     */
    findAllMinimalCovers(targetMinterms, availablePIs) {
        const allSolutions = [];
        let minCost = Infinity;

        // 窮舉所有可能的PI組合
        const numPIs = availablePIs.length;
        const maxCombinations = Math.pow(2, numPIs);

        for (let combination = 1; combination < maxCombinations; combination++) {
            const selectedPIs = [];
            let totalCost = 0;
            const coveredMinterms = new Set();

            // 檢查這個組合包含哪些PI
            for (let i = 0; i < numPIs; i++) {
                if (combination & (1 << i)) {
                    const pi = availablePIs[i];
                    selectedPIs.push(pi);
                    totalCost += pi.cost;
                    pi.minterms.forEach(m => {
                        if (targetMinterms.includes(m)) {
                            coveredMinterms.add(m);
                        }
                    });
                }
            }

            // 檢查是否覆蓋所有目標minterms
            const isValidCover = targetMinterms.every(m => coveredMinterms.has(m));

            if (isValidCover) {
                if (totalCost < minCost) {
                    // 找到更低成本的解，清空之前的解
                    minCost = totalCost;
                    allSolutions.length = 0;
                    allSolutions.push({
                        pis: selectedPIs.slice(),
                        cost: totalCost,
                        expression: selectedPIs.map(pi => pi.algebraic).join(' + ')
                    });
                } else if (totalCost === minCost) {
                    // 找到相同成本的解
                    allSolutions.push({
                        pis: selectedPIs.slice(),
                        cost: totalCost,
                        expression: selectedPIs.map(pi => pi.algebraic).join(' + ')
                    });
                }
            }
        }

        return allSolutions;
    }

    /**
     * 生成所有系統解組合
     */
    generateSystemSolutions(functionSolutions) {
        const funcNames = Object.keys(functionSolutions);
        const systemSolutions = [];

        // 計算所有組合的數量
        let totalCombinations = 1;
        const solutionCounts = {};
        
        funcNames.forEach(funcName => {
            const solutions = functionSolutions[funcName].allSolutions || [functionSolutions[funcName]];
            solutionCounts[funcName] = solutions.length;
            totalCombinations *= solutions.length;
        });

        // 生成所有組合
        for (let combination = 0; combination < totalCombinations; combination++) {
            const systemSolution = {};
            let combinationIndex = combination;

            // 為每個函數選擇一個解
            for (let i = funcNames.length - 1; i >= 0; i--) {
                const funcName = funcNames[i];
                const solutions = functionSolutions[funcName].allSolutions || [functionSolutions[funcName]];
                const solutionIndex = combinationIndex % solutions.length;
                combinationIndex = Math.floor(combinationIndex / solutions.length);

                systemSolution[funcName] = solutions[solutionIndex];
            }

            systemSolutions.push(systemSolution);
        }

        return systemSolutions;
    }

    /**
     * 建立聯合覆蓋表
     */
    buildJointCoverageTable(normalizedMinterms, allPIsByPattern) {
        const coverageTable = {};
        
        // 為每個函數的每個minterm建立覆蓋項
        Object.entries(normalizedMinterms).forEach(([funcName, minterms]) => {
            minterms.forEach(minterm => {
                const key = `${funcName}-m${minterm}`;
                coverageTable[key] = [];
                
                allPIsByPattern.forEach((piInfo, pattern) => {
                    if (piInfo.usedBy.includes(funcName) && piInfo.minterms.includes(minterm)) {
                        coverageTable[key].push(pattern);
                    }
                });
            });
        });
        
        return coverageTable;
    }

    /**
     * 解決聯合Patrick Method（使用成本剪枝的窮舉算法）
     */
    solveJointPatrickMethod(coverageTable, allPIsByPattern, normalizedMinterms = null) {
        // 建立Patrick表達式：每個minterm必須被至少一個PI覆蓋
        const patrickTerms = Object.values(coverageTable);
        const allPIPatterns = Array.from(allPIsByPattern.keys());
        
        this.calculationSteps[2].details.push(`建立Patrick表達式:`);
        Object.entries(coverageTable).forEach(([key, pis]) => {
            this.calculationSteps[2].details.push(`${key}: (${pis.join(' + ')})`);
        });
        this.calculationSteps[2].details.push('');
        
        // 使用成本剪枝的窮舉算法
        const numPIs = allPIPatterns.length;
        console.log(`總PI數量: ${numPIs}`);
        console.log('使用成本剪枝的窮舉算法');
        
        return this.solveWithCostPruning(coverageTable, allPIsByPattern, normalizedMinterms);
    }
    
    /**
     * 成本剪枝的窮舉算法
     */
    solveWithCostPruning(coverageTable, allPIsByPattern, normalizedMinterms = null) {
        const patrickTerms = Object.values(coverageTable);
        const allPIPatterns = Array.from(allPIsByPattern.keys());
        
        let minCost = 10000; // 初始最小成本
        let optimalSolutions = [];
        let checkedCombinations = 0;
        let prunedCombinations = 0;
        
        this.calculationSteps[2].details.push(`使用成本剪枝的回溯算法 (PI數量: ${allPIPatterns.length})`);
        this.calculationSteps[2].details.push(`初始最小成本閾值: ${minCost}`);
        this.calculationSteps[2].details.push('');
        
        // 檢查當前解是否覆蓋所有項目
        const isValidCover = (solution) => {
            return patrickTerms.every(term => term.some(pi => solution.includes(pi)));
        };
        
        // 計算還需要覆蓋的項目
        const getUncoveredTerms = (solution) => {
            return patrickTerms.filter(term => !term.some(pi => solution.includes(pi)));
        };
        
        // 估算剩餘最小成本（保守的啟發式剪枝）
        const estimateMinRemainingCost = (uncoveredTerms, availablePIs) => {
            if (uncoveredTerms.length === 0) return 0;
            
            // 使用更保守的估算：假設每個未覆蓋項目至少需要成本3的PI
            // 這樣可以避免過度剪枝
            return Math.ceil(uncoveredTerms.length / 4) * 3; // 假設每個PI平均覆蓋4個項目，成本3
        };
        
        // 改進的回溯搜索
        const backtrackSearch = (currentSolution, currentCost, availablePIs, startIndex = 0) => {
            // 成本剪枝
            if (currentCost >= minCost) {
                prunedCombinations++;
                return;
            }
            
            // 檢查是否已經是有效解
            if (isValidCover(currentSolution)) {
                checkedCombinations++;
                
                if (currentCost < minCost) {
                    minCost = currentCost;
                    optimalSolutions = [currentSolution.slice()];
                    console.log(`找到更優解，成本: ${minCost}, 解: ${currentSolution.join(',')}`);
                } else if (currentCost === minCost) {
                    optimalSolutions.push(currentSolution.slice());
                    console.log(`找到相同成本解，成本: ${minCost}, 解: ${currentSolution.join(',')}`);
                }
                return;
            }
            
            // 保守的啟發式剪枝：只在差距很大時才剪枝
            const uncoveredTerms = getUncoveredTerms(currentSolution);
            const estimatedMinCost = estimateMinRemainingCost(uncoveredTerms, availablePIs);
            
            // 只有當估算的總成本明顯超過當前最小成本時才剪枝
            if (currentCost + estimatedMinCost > minCost + 5) {
                prunedCombinations++;
                return;
            }
            
            // 選擇策略：嘗試所有能覆蓋未覆蓋項目的PI（確保找到所有解）
            for (let i = startIndex; i < availablePIs.length; i++) {
                const pi = availablePIs[i];
                const piCost = allPIsByPattern.get(pi).cost;
                
                // 檢查這個PI是否能覆蓋任何未覆蓋的項目
                let canCoverSomething = false;
                uncoveredTerms.forEach(term => {
                    if (term.includes(pi)) {
                        canCoverSomething = true;
                    }
                });
                
                if (canCoverSomething && currentCost + piCost < minCost) {
                    currentSolution.push(pi);
                    
                    // 遞歸搜索，從下一個PI開始以避免重複組合
                    backtrackSearch(currentSolution, currentCost + piCost, availablePIs, i + 1);
                    
                    currentSolution.pop();
                }
            }
        };
        
        console.log('開始成本剪枝搜索...');
        const startTime = Date.now();
        
        // 使用傳統的Patrick Method搜索算法，支持多重解，並傳入函數信息
        const searchResult = this.searchPatrickSolutions(patrickTerms, allPIsByPattern, normalizedMinterms);
        
        const endTime = Date.now();
        const searchTime = endTime - startTime;
        
        this.calculationSteps[2].details.push(`搜索完成，耗時: ${searchTime}ms`);
        this.calculationSteps[2].details.push(`檢查組合數: ${searchResult.checkedCombinations}`);
        this.calculationSteps[2].details.push(`剪枝組合數: ${searchResult.prunedCombinations}`);
        this.calculationSteps[2].details.push(`找到 ${searchResult.solutions.length} 個最佳解，最小成本: ${searchResult.minCost}`);
        
        searchResult.solutions.forEach((sol, index) => {
            this.calculationSteps[2].details.push(`解${index + 1}: ${sol.join(', ')} (成本: ${searchResult.minCost})`);
        });
        
        console.log(`成本剪枝完成: 檢查${searchResult.checkedCombinations}個組合, 剪枝${searchResult.prunedCombinations}個, 耗時${searchTime}ms`);
        
        optimalSolutions = searchResult.solutions;
        
        return optimalSolutions;
    }
    
    /**
     * 傳統Patrick Method搜索，支持多重解
     */
    searchPatrickSolutions(patrickTerms, allPIsByPattern, normalizedMinterms = null) {
        const allPIPatterns = Array.from(allPIsByPattern.keys());
        const numPIs = allPIPatterns.length;
        
        console.log(`開始Patrick Method搜索，PI數量: ${numPIs}`);
        
        // 根據PI數量選擇不同的策略
        if (numPIs <= 20) {
            console.log("使用窮舉搜索");
            // 使用窮舉搜索，傳入函數信息以進行三階段成本計算
            const result = this.solveWithExhaustiveSearch({ 
                ...Object.fromEntries(patrickTerms.map((term, i) => [i, term]))
            }, allPIsByPattern, normalizedMinterms);
            
            return {
                solutions: result,
                minCost: result.length > 0 ? this.calculateSolutionCost(result[0], allPIsByPattern) : Infinity,
                checkedCombinations: 0,
                prunedCombinations: 0
            };
        } else {
            console.log("使用回溯搜索");
            // 直接使用回溯搜索，避免遞歸調用
            return this.backtrackSearchDirect(patrickTerms, allPIsByPattern);
        }
    }
    
    /**
     * 直接回溯搜索，避免遞歸調用問題
     * 分兩階段：先找最小成本，再找所有相同成本的解
     */
    backtrackSearchDirect(patrickTerms, allPIsByPattern) {
        const allPIPatterns = Array.from(allPIsByPattern.keys());
        let minCost = Infinity;
        let optimalSolutions = [];
        let checkedCombinations = 0;
        let prunedCombinations = 0;
        
        const isValidCover = (solution) => {
            return patrickTerms.every(term => term.some(pi => solution.includes(pi)));
        };
        
        // 第一階段：找到最小成本
        const findMinCost = (currentSolution, currentCost, startIndex = 0) => {
            // 早期剪枝：如果當前成本已經超過最小成本
            if (currentCost >= minCost) {
                prunedCombinations++;
                return;
            }
            
            // 檢查當前解是否有效
            if (isValidCover(currentSolution)) {
                checkedCombinations++;
                
                if (currentCost < minCost) {
                    minCost = currentCost;
                    console.log(`當前最小成本: ${minCost}`);
                }
                return;
            }
            
            // 嘗試添加更多PI
            for (let i = startIndex; i < allPIPatterns.length; i++) {
                const pattern = allPIPatterns[i];
                if (!currentSolution.includes(pattern)) {
                    const piCost = allPIsByPattern.get(pattern).cost;
                    const newCost = currentCost + piCost;
                    
                    // 早期剪枝
                    if (newCost < minCost) {
                        currentSolution.push(pattern);
                        findMinCost(currentSolution, newCost, i + 1);
                        currentSolution.pop();
                    } else {
                        prunedCombinations++;
                    }
                }
            }
        };
        
        // 第二階段：找到所有最小成本的解
        const findAllOptimalSolutions = (currentSolution, currentCost, startIndex = 0) => {
            // 如果成本超過最小成本，剪枝
            if (currentCost > minCost) {
                return;
            }
            
            // 檢查當前解是否有效
            if (isValidCover(currentSolution)) {
                if (currentCost === minCost) {
                    // 檢查是否已經存在相同的解
                    const solutionStr = currentSolution.slice().sort().join(',');
                    const exists = optimalSolutions.some(sol => 
                        sol.slice().sort().join(',') === solutionStr
                    );
                    if (!exists) {
                        optimalSolutions.push(currentSolution.slice());
                    }
                }
                return;
            }
            
            // 嘗試添加更多PI
            for (let i = startIndex; i < allPIPatterns.length; i++) {
                const pattern = allPIPatterns[i];
                if (!currentSolution.includes(pattern)) {
                    const piCost = allPIsByPattern.get(pattern).cost;
                    const newCost = currentCost + piCost;
                    
                    // 只搜索不超過最小成本的組合
                    if (newCost <= minCost) {
                        currentSolution.push(pattern);
                        findAllOptimalSolutions(currentSolution, newCost, i + 1);
                        currentSolution.pop();
                    }
                }
            }
        };
        
        console.log("第一階段：尋找最小成本...");
        // 第一階段：找最小成本
        findMinCost([], 0, 0);
        
        console.log(`第二階段：尋找所有成本為 ${minCost} 的解...`);
        // 第二階段：找所有最小成本的解
        findAllOptimalSolutions([], 0, 0);
        
        console.log(`\n搜索完成!`);
        console.log(`找到 ${optimalSolutions.length} 個最佳解，最小成本: ${minCost}`);
        optimalSolutions.forEach((sol, index) => {
            const algebraic = sol.map(pattern => this.convertPatternToAlgebraic(pattern)).join(' + ');
            console.log(`解${index + 1}: F = ${algebraic}`);
        });
        
        return {
            solutions: optimalSolutions,
            minCost: minCost,
            checkedCombinations: checkedCombinations,
            prunedCombinations: prunedCombinations
        };
    }
    
    /**
     * 窮舉搜索（僅用於小問題）- 使用三階段成本計算進行剪枝
     */
    solveWithExhaustiveSearch(coverageTable, allPIsByPattern, normalizedMinterms = null) {
        const patrickTerms = Object.values(coverageTable);
        const allPIPatterns = Array.from(allPIsByPattern.keys());
        const numPIs = allPIPatterns.length;
        const maxCombinations = Math.pow(2, numPIs);
        
        let minCost = Infinity;
        let minPICount = Infinity;
        let optimalSolutions = [];
        let prunedCombinations = 0;
        let stage1PrunedCombinations = 0;
        let stage3PrunedCombinations = 0;
        let totalCombinations = 0;
        let validCombinations = 0;
        let threeStageCalculations = 0;
        
        console.log(`開始Patrick Method搜索...`);
        
        for (let combination = 1; combination < maxCombinations; combination++) {
            totalCombinations++;
            const selectedPIs = [];
            
            // 收集這個組合包含的PI
            for (let i = 0; i < numPIs; i++) {
                if (combination & (1 << i)) {
                    const pattern = allPIPatterns[i];
                    selectedPIs.push(pattern);
                }
            }
            
            // 檢查是否覆蓋所有required terms
            let isValidCover = true;
            for (let termIndex = 0; termIndex < patrickTerms.length; termIndex++) {
                const term = patrickTerms[termIndex];
                const isCovered = term.some(pi => selectedPIs.includes(pi));
                if (!isCovered) {
                    isValidCover = false;
                    break;
                }
            }
            
            // 如果不是有效覆蓋，跳過
            if (!isValidCover) {
                continue;
            }
            
            // 有效覆蓋，檢查是否為新的最小成本
            validCombinations++;
            
            // 第一層剪枝：使用Stage 1成本進行快速剪枝
            const stage1Cost = selectedPIs.reduce((total, pattern) => {
                return total + allPIsByPattern.get(pattern).cost;
            }, 0);
            
            // 如果Stage 1成本已經超過當前最小成本，直接剪枝
            if (minCost < Infinity && stage1Cost > minCost) {
                stage1PrunedCombinations++;
                prunedCombinations++;
                continue;
            }
            
            // 第二層：計算完整三階段成本（只對通過第一層剪枝的組合）
            let finalCost;
            if (normalizedMinterms) {
                // 使用三階段成本計算
                threeStageCalculations++;
                finalCost = this.calculateThreeStagesCost(selectedPIs, normalizedMinterms, allPIsByPattern);
            } else {
                // 回退到第一階段成本計算
                finalCost = stage1Cost;
            }
            
            // 第三層剪枝：使用三階段成本進行最終剪枝
            if (minCost < Infinity && finalCost > minCost) {
                stage3PrunedCombinations++;
                prunedCombinations++;
                continue;
            }
            
            const piCount = selectedPIs.length;
            
            if (finalCost < minCost || (finalCost === minCost && piCount < minPICount)) {
                // 找到更優解（成本更低，或成本相同但PI數量更少）
                minCost = finalCost;
                minPICount = piCount;
                optimalSolutions = [selectedPIs.slice()];
                console.log(`當前最佳解: 成本=${minCost}, PI數量=${minPICount}`);
            } else if (finalCost === minCost && piCount === minPICount) {
                // 找到相同成本且相同PI數量的解
                optimalSolutions.push(selectedPIs.slice());
            }
        }
        
        console.log(`\n搜索完成!`);
        console.log(`總組合數: ${totalCombinations}, 有效組合: ${validCombinations}, 剪枝組合: ${prunedCombinations}`);
        console.log(`剪枝詳情: Stage1剪枝=${stage1PrunedCombinations}, Stage3剪枝=${stage3PrunedCombinations}`);
        console.log(`三階段計算次數: ${threeStageCalculations} (節省: ${validCombinations - threeStageCalculations})`);
        console.log(`找到 ${optimalSolutions.length} 個最佳解，最小成本: ${minCost}，最少PI數量: ${minPICount}`);
        optimalSolutions.forEach((sol, index) => {
            const algebraic = sol.map(pattern => this.convertPatternToAlgebraic(pattern)).join(' + ');
            console.log(`解${index + 1}: F = ${algebraic} (PI數量: ${sol.length})`);
        });
        
        this.calculationSteps[2].details.push(`找到 ${optimalSolutions.length} 個最佳解，最小成本: ${minCost}，最少PI數量: ${minPICount}`);
        optimalSolutions.forEach((sol, index) => {
            this.calculationSteps[2].details.push(`解${index + 1}: ${sol.join(', ')} (成本: ${minCost}, PI數量: ${sol.length})`);
        });
        
        return optimalSolutions;
    }

    /**
     * 計算三階段Patrick Method成本
     * Stage 1: 基本PI生成
     * Stage 2: 冗餘移除 
     * Stage 3: 共享成本計算
     */
    calculateThreeStagesCost(selectedPIs, normalizedMinterms, allPIsByPattern) {
        // Stage 1: 基本成本（PI選擇成本）
        const stage1Cost = selectedPIs.reduce((total, pattern) => {
            return total + allPIsByPattern.get(pattern).cost;
        }, 0);
        
        // Stage 2: 為每個函數進行冗餘移除
        const stage2Solutions = {};
        
        Object.entries(normalizedMinterms).forEach(([funcName, minterms]) => {
            // 找出適用於此函數的PI
            const functionPIs = [];
            selectedPIs.forEach(pattern => {
                const piInfo = allPIsByPattern.get(pattern);
                if (piInfo && piInfo.usedBy.includes(funcName)) {
                    const coveredMinterms = piInfo.minterms.filter(m => minterms.includes(m));
                    if (coveredMinterms.length > 0) {
                        functionPIs.push({
                            pattern: pattern,
                            algebraic: this.convertPatternToAlgebraic(pattern),
                            minterms: coveredMinterms,
                            cost: piInfo.cost
                        });
                    }
                }
            });
            
            if (functionPIs.length > 0) {
                // 進行冗餘移除（簡化版）
                const optimizedPIs = this.removeRedundantPIsForStage2(functionPIs, minterms);
                stage2Solutions[funcName] = optimizedPIs;
            }
        });
        
        // 💾 保存Stage 2結果到實例變數，供後續使用
        const stage2Key = [...selectedPIs].sort().join(',');
        if (!this._stage2Cache) {
            this._stage2Cache = new Map();
        }
        this._stage2Cache.set(stage2Key, stage2Solutions);
        
        // Stage 3: 計算共享成本
        const piUsageMap = new Map();
        
        // 統計每個PI的使用次數
        Object.values(stage2Solutions).forEach(funcPIs => {
            funcPIs.forEach(pi => {
                if (piUsageMap.has(pi.pattern)) {
                    piUsageMap.get(pi.pattern).usageCount++;
                } else {
                    piUsageMap.set(pi.pattern, {
                        pattern: pi.pattern,
                        baseCost: pi.cost,
                        usageCount: 1
                    });
                }
            });
        });
        
        // 計算共享成本：shared_cost = base_cost + (usage_count - 1)
        let stage3TotalCost = 0;
        piUsageMap.forEach((piInfo, pattern) => {
            const sharedCost = piInfo.baseCost + (piInfo.usageCount - 1);
            stage3TotalCost += sharedCost;
        });
        
        // 合併輸出一行，包含PI數量
        console.log(`Stage 1: ${stage1Cost} Stage 3: ${stage3TotalCost} 🎯 組合: [${selectedPIs.join(', ')}] PI數量: ${selectedPIs.length}`);
        
        return stage3TotalCost;
    }

    /**
     * 通用的冗餘PI移除方法（別名）
     */
    removeRedundantPIs(functionPIs, targetMinterms) {
        return this.removeRedundantPIsForStage2(functionPIs, targetMinterms);
    }

    /**
     * Stage 2 專用的冗餘PI移除（改進版）
     * 能夠檢測PI之間的包含關係，如y包含yz'和x'y
     */
    removeRedundantPIsForStage2(functionPIs, targetMinterms) {
        if (functionPIs.length <= 1) {
            return functionPIs;
        }
        
        // 第一步：移除被其他PI完全包含的PI
        const nonRedundantPIs = [];
        
        functionPIs.forEach(pi => {
            // 檢查此PI是否被其他任何PI包含
            const isRedundant = functionPIs.some(otherPI => {
                if (pi.pattern === otherPI.pattern) return false;
                
                // 檢查otherPI是否包含pi的所有minterms
                const piMintermsInTarget = pi.minterms.filter(m => targetMinterms.includes(m));
                const otherPIMintermsInTarget = otherPI.minterms.filter(m => targetMinterms.includes(m));
                
                // 如果otherPI包含pi的所有目標minterms且成本更低或相等，則pi是冗餘的
                const isIncluded = piMintermsInTarget.every(m => otherPIMintermsInTarget.includes(m));
                const isBetterOrEqual = otherPI.cost <= pi.cost;
                
                return isIncluded && isBetterOrEqual;
            });
            
            if (!isRedundant) {
                nonRedundantPIs.push(pi);
            }
        });
        
        // 第二步：找Essential PIs
        const essentialPIs = [];
        const remainingMinterms = new Set(targetMinterms);
        
        targetMinterms.forEach(minterm => {
            const coveringPIs = nonRedundantPIs.filter(pi => pi.minterms.includes(minterm));
            if (coveringPIs.length === 1) {
                const essentialPI = coveringPIs[0];
                if (!essentialPIs.find(pi => pi.pattern === essentialPI.pattern)) {
                    essentialPIs.push(essentialPI);
                    essentialPI.minterms.forEach(m => {
                        if (targetMinterms.includes(m)) {
                            remainingMinterms.delete(m);
                        }
                    });
                }
            }
        });
        
        // 第三步：用效率優先的貪婪算法覆蓋剩餘minterms
        const selectedPIs = [...essentialPIs];
        const unusedPIs = nonRedundantPIs.filter(pi => 
            !essentialPIs.find(essential => essential.pattern === pi.pattern)
        );
        
        while (remainingMinterms.size > 0 && unusedPIs.length > 0) {
            let bestPI = null;
            let bestEfficiency = 0;
            
            unusedPIs.forEach(pi => {
                const coveredCount = pi.minterms.filter(m => remainingMinterms.has(m)).length;
                if (coveredCount > 0) {
                    // 計算效率：覆蓋的minterms數量 / 成本
                    const efficiency = coveredCount / pi.cost;
                    if (efficiency > bestEfficiency) {
                        bestEfficiency = efficiency;
                        bestPI = pi;
                    }
                }
            });
            
            if (bestPI) {
                selectedPIs.push(bestPI);
                bestPI.minterms.forEach(m => {
                    if (remainingMinterms.has(m)) {
                        remainingMinterms.delete(m);
                    }
                });
                
                const index = unusedPIs.indexOf(bestPI);
                if (index > -1) {
                    unusedPIs.splice(index, 1);
                }
            } else {
                break;
            }
        }
        
        // 第四步：最終檢查，移除任何剩餘的冗餘PI
        const finalPIs = [];
        for (const pi of selectedPIs) {
            // 檢查移除此PI後是否仍能覆蓋所有minterms
            const otherPIs = selectedPIs.filter(p => p.pattern !== pi.pattern);
            const coveredByOthers = new Set();
            otherPIs.forEach(otherPI => {
                otherPI.minterms.forEach(m => {
                    if (targetMinterms.includes(m)) {
                        coveredByOthers.add(m);
                    }
                });
            });
            
            // 如果其他PI不能覆蓋所有目標minterms，則此PI是必要的
            const isNecessary = targetMinterms.some(m => !coveredByOthers.has(m));
            if (isNecessary) {
                finalPIs.push(pi);
            }
        }
        
        return finalPIs;
    }

    /**
     * 貪婪算法
     */
    greedySolution(patrickTerms, allPIPatterns, allPIsByPattern) {
        const selectedPIs = [];
        const uncoveredTerms = patrickTerms.map((term, index) => ({ term, index, covered: false }));
        
        while (uncoveredTerms.some(t => !t.covered)) {
            let bestPI = null;
            let bestScore = -1;
            
            // 找到覆蓋最多未覆蓋項且效率最高的PI
            allPIPatterns.forEach(pattern => {
                if (selectedPIs.includes(pattern)) return;
                
                let coveredCount = 0;
                uncoveredTerms.forEach(termInfo => {
                    if (!termInfo.covered && termInfo.term.includes(pattern)) {
                        coveredCount++;
                    }
                });
                
                if (coveredCount > 0) {
                    const cost = allPIsByPattern.get(pattern).cost;
                    const score = coveredCount / cost; // 效率分數
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestPI = pattern;
                    }
                }
            });
            
            if (bestPI) {
                selectedPIs.push(bestPI);
                
                // 更新覆蓋狀態
                uncoveredTerms.forEach(termInfo => {
                    if (termInfo.term.includes(bestPI)) {
                        termInfo.covered = true;
                    }
                });
            } else {
                break; // 無法找到更多覆蓋
            }
        }
        
        return selectedPIs;
    }
    
    /**
     * 局部優化
     */
    localOptimize(solution, patrickTerms, allPIPatterns, allPIsByPattern) {
        const optimized = solution.slice();
        
        // 嘗試移除不必要的PI
        for (let i = optimized.length - 1; i >= 0; i--) {
            const testSolution = optimized.slice();
            testSolution.splice(i, 1);
            
            if (this.isValidSolution(testSolution, patrickTerms)) {
                optimized.splice(i, 1);
            }
        }
        
        return optimized;
    }
    
    /**
     * 檢查解是否有效
     */
    isValidSolution(solution, patrickTerms) {
        return patrickTerms.every(term => term.some(pi => solution.includes(pi)));
    }
    
    /**
     * 計算解的成本
     */
    calculateSolutionCost(solution, allPIsByPattern) {
        return solution.reduce((total, pattern) => {
            return total + allPIsByPattern.get(pattern).cost;
        }, 0);
    }

    /**
     * 從聯合解生成系統解
     */
    generateSystemSolutionsFromJoint(jointSolutions, normalizedMinterms) {
        const systemSolutions = [];
        
        jointSolutions.forEach((solution, solutionIndex) => {
            console.log(`\n生成系統解決方案 ${solutionIndex + 1}`);
            const systemSolution = {};
            
            Object.entries(normalizedMinterms).forEach(([funcName, minterms]) => {
                console.log(`\n處理函數 ${funcName}，目標minterms: [${minterms.join(',')}]`);
                const functionPIs = [];
                
                solution.forEach(pattern => {
                    // 檢查這個PI是否覆蓋這個函數的minterms
                    const piInfo = this.getAllPIsByPattern().get(pattern);
                    if (piInfo && piInfo.usedBy.includes(funcName)) {
                        const coveredMinterms = piInfo.minterms.filter(m => minterms.includes(m));
                        if (coveredMinterms.length > 0) {
                            functionPIs.push({
                                pattern: pattern,
                                algebraic: this.convertPatternToAlgebraic(pattern),
                                minterms: coveredMinterms,
                                cost: piInfo.cost
                            });
                        }
                    }
                });
                
                if (functionPIs.length > 0) {
                    console.log(`${funcName} 初始PI數量: ${functionPIs.length}`);
                    
                    // 應用Stage 2的冗餘移除邏輯
                    const optimizedPIs = this.removeRedundantPIsForStage2(functionPIs, minterms);
                    console.log(`${funcName} Stage 2優化後PI數量: ${optimizedPIs.length}`);
                    
                    systemSolution[funcName] = {
                        pis: optimizedPIs,
                        expression: optimizedPIs.map(pi => pi.algebraic).join(' + '),
                        cost: optimizedPIs.reduce((sum, pi) => sum + pi.cost, 0)
                    };
                    
                    console.log(`${funcName} 最終表達式: ${systemSolution[funcName].expression}`);
                }
            });
            
            systemSolutions.push(systemSolution);
        });
        
        return systemSolutions;
    }

    /**
     * 獲取所有PI的引用（用於聯合解決方案）
     */
    getAllPIsByPattern() {
        return this._allPIsByPattern || new Map();
    }

    /**
     * 設置所有PI的引用
     */
    setAllPIsByPattern(allPIsByPattern) {
        this._allPIsByPattern = allPIsByPattern;
    }


}

/**
 * 多輸出Patrick Method擴展類
 */
class MultipleOutputPatrick extends PatrickMethod {
    constructor() {
        super();
    }

    /**
     * 執行多輸出最佳化的主要方法
     * 這是對外的主要接口，與web版本兼容
     */
    executeMultipleOutput(mintermsByFunction, numVars, dontCares = []) {
        return super.executeMultipleOutput(mintermsByFunction, numVars, dontCares);
    }
}

// 如果在瀏覽器環境中，將類加到全域作用域
if (typeof window !== 'undefined') {
    window.PatrickMethod = PatrickMethod;
    window.MultipleOutputPatrick = MultipleOutputPatrick;
}

// 如果在Node.js環境中，導出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PatrickMethod, MultipleOutputPatrick };
}