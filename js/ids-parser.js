// js/ids-parser.js

/**
 * Класс для парсинга IDS XML в JavaScript объекты
 */
class IDSParser {
    constructor() {
        this.parser = new DOMParser();
        this.serializer = new XMLSerializer();
    }

    /**
     * Парсит XML строку в объект IDS
     * @param {string} xmlString - Содержимое IDS файла
     * @returns {Object} - Объект с данными IDS
     */
    parse(xmlString) {
        const xmlDoc = this.parser.parseFromString(xmlString, "text/xml");
        
        // Проверка на ошибки парсинга
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Ошибка парсинга XML: ' + parseError.textContent);
        }

        // Извлекаем информацию о файле
        const info = this.parseInfo(xmlDoc);
        
        // Извлекаем спецификации
        const specifications = this.parseSpecifications(xmlDoc);

        return {
            info,
            specifications
        };
    }

    /**
     * Парсит секцию info
     */
    parseInfo(xmlDoc) {
        const infoNode = xmlDoc.querySelector('info');
        if (!infoNode) return null;

        return {
            title: this.getTextContent(infoNode, 'title') || 'Без названия',
            copyright: this.getTextContent(infoNode, 'copyright') || '',
            version: this.getTextContent(infoNode, 'version') || 'IFC4',
            author: this.getTextContent(infoNode, 'author') || '',
            date: this.getTextContent(infoNode, 'date') || this.getCurrentDate(),
            description: this.getTextContent(infoNode, 'description') || '',
            purpose: this.getTextContent(infoNode, 'purpose') || '',
            milestone: this.getTextContent(infoNode, 'milestone') || ''
        };
    }

    /**
     * Парсит все спецификации
     */
    parseSpecifications(xmlDoc) {
        const specNodes = xmlDoc.querySelectorAll('specification');
        const specifications = [];

        specNodes.forEach((specNode, index) => {
            const spec = this.parseSpecification(specNode, index);
            specifications.push(spec);
        });

        return specifications;
    }

    /**
     * Парсит одну спецификацию
     */
    parseSpecification(specNode, index) {
        const name = specNode.getAttribute('name') || `Спецификация ${index + 1}`;
        const ifcVersion = specNode.getAttribute('ifcVersion') || 'IFC4';

        // Парсим applicability (условия отбора)
        const applicability = this.parseApplicability(specNode);
        
        // Парсим requirements (требования)
        const requirements = this.parseRequirements(specNode);

        return {
            id: `spec_${Date.now()}_${index}`,
            name: name,
            ifcVersion: ifcVersion,
            applicability: applicability,
            requirements: requirements
        };
    }

    /**
     * Парсит секцию applicability
     */
    parseApplicability(specNode) {
        const applicabilityNode = specNode.querySelector('applicability');
        if (!applicabilityNode) return { rules: [] };

        const rules = [];

        // Парсим entity правила
        const entityNodes = applicabilityNode.querySelectorAll('entity');
        entityNodes.forEach(entityNode => {
            const nameNode = entityNode.querySelector('name simpleValue');
            if (nameNode) {
                rules.push({
                    type: 'entity',
                    field: 'name',
                    condition: 'equals',
                    value: nameNode.textContent,
                    displayType: 'Сущность IFC'
                });
            }
        });

        // Парсим attribute правила (добавим позже)
        // Парсим classification правила (добавим позже)

        return { rules };
    }

    /**
     * Парсит секцию requirements
     */
    parseRequirements(specNode) {
        const requirementsNode = specNode.querySelector('requirements');
        if (!requirementsNode) return { rules: [] };

        const rules = [];

        // Парсим property правила
        const propertyNodes = requirementsNode.querySelectorAll('property');
        propertyNodes.forEach(propertyNode => {
            const rule = this.parsePropertyRule(propertyNode);
            if (rule) rules.push(rule);
        });

        return { rules };
    }

    /**
     * Парсит правило для свойства (property)
     */
    parsePropertyRule(propertyNode) {
        // Получаем кардинальность
        const cardinality = propertyNode.getAttribute('cardinality') || 'optional';
        
        // Получаем тип данных
        const dataType = propertyNode.getAttribute('dataType') || 'IFCTEXT';

        // Получаем имя propertySet
        const propertySetNode = propertyNode.querySelector('propertySet simpleValue');
        const propertySet = propertySetNode ? propertySetNode.textContent : '';

        // Получаем имя свойства
        const baseNameNode = propertyNode.querySelector('baseName simpleValue');
        const baseName = baseNameNode ? baseNameNode.textContent : '';

        // Парсим значение (может быть simpleValue или restriction)
        const valueNode = propertyNode.querySelector('value');
        let condition = 'equals';
        let value = '';

        if (valueNode) {
            // Проверяем на simpleValue
            const simpleValue = valueNode.querySelector('simpleValue');
            if (simpleValue) {
                value = simpleValue.textContent;
                condition = 'equals';
            } else {
                // Проверяем на restriction (это наши паттерны из примеров)
                const restriction = valueNode.querySelector('xs\\:restriction, restriction');
                if (restriction) {
                    const restrictionParse = this.parseRestriction(restriction);
                    condition = restrictionParse.condition;
                    value = restrictionParse.value;
                }
            }
        }

        return {
            type: 'property',
            field: baseName,
            propertySet: propertySet,
            dataType: dataType,
            cardinality: this.mapCardinality(cardinality),
            condition: condition,
            value: value,
            displayType: 'Свойство'
        };
    }

    /**
     * Парсит restriction (для паттернов и перечислений)
     */
    parseRestriction(restrictionNode) {
        // Проверяем на enumeration (перечисление значений)
        const enumerations = restrictionNode.querySelectorAll('xs\\:enumeration, enumeration');
        if (enumerations.length > 0) {
            const values = [];
            enumerations.forEach(enumNode => {
                const value = enumNode.getAttribute('value');
                if (value) values.push(value);
            });
            return {
                condition: 'in',
                value: values
            };
        }

        // Проверяем на pattern
        const pattern = restrictionNode.querySelector('xs\\:pattern, pattern');
        if (pattern) {
            const patternValue = pattern.getAttribute('value');
            
            // Определяем тип паттерна по содержимому
            if (patternValue === 'ЭЛ .*') {
                return {
                    condition: 'startsWith',
                    value: 'ЭЛ '
                };
            } else if (patternValue === '.*ЭЛ .*') {
                return {
                    condition: 'contains',
                    value: 'ЭЛ '
                };
            } else if (patternValue.endsWith('$')) {
                // Заканчивается на
                const endsWithValue = patternValue.replace('.*', '').replace('$', '');
                return {
                    condition: 'endsWith',
                    value: endsWithValue
                };
            }
        }

        return {
            condition: 'equals',
            value: ''
        };
    }

    /**
     * Преобразует кардинальность в человеко-понятный формат
     */
    mapCardinality(cardinality) {
        const map = {
            'required': 'Обязательно',
            'optional': 'Опционально',
            'prohibited': 'Запрещено'
        };
        return map[cardinality] || cardinality;
    }

    /**
     * Вспомогательная функция для получения текста из узла
     */
    getTextContent(parent, selector) {
        const node = parent.querySelector(selector);
        return node ? node.textContent : null;
    }

    /**
     * Возвращает текущую дату в формате YYYY-MM-DD
     */
    getCurrentDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    /**
     * Преобразует объект IDS обратно в XML строку (для сохранения)
     */
    generateXML(idsObject) {
        // Базовая структура XML
        let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
        xml += `<ids xsi:noNamespaceSchemaLocation="ids.xsd" xmlns="http://standards.buildingsmart.org/IDS" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
        
        // Добавляем info
        xml += `    <info>\n`;
        if (idsObject.info) {
            xml += `        <title>${this.escapeXML(idsObject.info.title || '')}</title>\n`;
            xml += `        <copyright>${this.escapeXML(idsObject.info.copyright || 'Пользователь')}</copyright>\n`;
            xml += `        <version>${this.escapeXML(idsObject.info.version || 'IFC4')}</version>\n`;
            xml += `        <author>${this.escapeXML(idsObject.info.author || '')}</author>\n`;
            xml += `        <date>${this.escapeXML(idsObject.info.date || this.getCurrentDate())}</date>\n`;
            xml += `        <description>${this.escapeXML(idsObject.info.description || '')}</description>\n`;
            xml += `        <purpose>${this.escapeXML(idsObject.info.purpose || '')}</purpose>\n`;
            xml += `        <milestone>${this.escapeXML(idsObject.info.milestone || '')}</milestone>\n`;
        } else {
            xml += `        <title>Сгенерированная проверка</title>\n`;
            xml += `        <copyright>Пользователь</copyright>\n`;
            xml += `        <version>IFC4</version>\n`;
            xml += `        <author></author>\n`;
            xml += `        <date>${this.getCurrentDate()}</date>\n`;
        }
        xml += `    </info>\n`;

        // Добавляем спецификации
        xml += `    <specifications>\n`;
        
        if (idsObject.specifications && idsObject.specifications.length > 0) {
            idsObject.specifications.forEach(spec => {
                xml += this.generateSpecificationXML(spec);
            });
        }
        
        xml += `    </specifications>\n`;
        xml += `</ids>`;

        return xml;
    }

    /**
     * Генерирует XML для одной спецификации
     */
    generateSpecificationXML(spec) {
        let xml = `        <specification name="${this.escapeXML(spec.name)}" ifcVersion="${this.escapeXML(spec.ifcVersion || 'IFC4')}">\n`;

        // Генерируем applicability
        xml += `            <applicability minOccurs="0" maxOccurs="unbounded">\n`;
        
        // Добавляем entity правила
        if (spec.applicability && spec.applicability.rules) {
            spec.applicability.rules.forEach(rule => {
                if (rule.type === 'entity') {
                    xml += `                <entity>\n`;
                    xml += `                    <name>\n`;
                    xml += `                        <simpleValue>${this.escapeXML(rule.value)}</simpleValue>\n`;
                    xml += `                    </name>\n`;
                    xml += `                </entity>\n`;
                }
            });
        }
        
        xml += `            </applicability>\n`;

        // Генерируем requirements
        xml += `            <requirements>\n`;
        
        if (spec.requirements && spec.requirements.rules) {
            spec.requirements.rules.forEach(rule => {
                if (rule.type === 'property') {
                    xml += this.generatePropertyXML(rule);
                }
            });
        }
        
        xml += `            </requirements>\n`;
        xml += `        </specification>\n`;

        return xml;
    }

    /**
     * Генерирует XML для property правила
     */
    generatePropertyXML(rule) {
        // Обратная карта для кардинальности
        const cardinalityMap = {
            'Обязательно': 'required',
            'Опционально': 'optional',
            'Запрещено': 'prohibited'
        };

        const cardinality = cardinalityMap[rule.cardinality] || rule.cardinality || 'optional';

        let xml = `                <property cardinality="${cardinality}" dataType="${rule.dataType || 'IFCTEXT'}">\n`;
        xml += `                    <propertySet>\n`;
        xml += `                        <simpleValue>${this.escapeXML(rule.propertySet || '')}</simpleValue>\n`;
        xml += `                    </propertySet>\n`;
        xml += `                    <baseName>\n`;
        xml += `                        <simpleValue>${this.escapeXML(rule.field || '')}</simpleValue>\n`;
        xml += `                    </baseName>\n`;
        xml += `                    <value>\n`;

        // Генерируем значение в зависимости от условия
        if (rule.condition === 'in' && Array.isArray(rule.value)) {
            xml += `                        <xs:restriction base="xs:string">\n`;
            rule.value.forEach(val => {
                xml += `                            <xs:enumeration value="${this.escapeXML(val)}"/>\n`;
            });
            xml += `                        </xs:restriction>\n`;
        } else if (rule.condition === 'startsWith') {
            xml += `                        <xs:restriction base="xs:string">\n`;
            xml += `                            <xs:pattern value="${this.escapeXML(rule.value)}.*"/>\n`;
            xml += `                        </xs:restriction>\n`;
        } else if (rule.condition === 'contains') {
            xml += `                        <xs:restriction base="xs:string">\n`;
            xml += `                            <xs:pattern value=".*${this.escapeXML(rule.value)}.*"/>\n`;
            xml += `                        </xs:restriction>\n`;
        } else if (rule.condition === 'endsWith') {
            xml += `                        <xs:restriction base="xs:string">\n`;
            xml += `                            <xs:pattern value=".*${this.escapeXML(rule.value)}$"/>\n`;
            xml += `                        </xs:restriction>\n`;
        } else {
            xml += `                        <simpleValue>${this.escapeXML(rule.value || '')}</simpleValue>\n`;
        }

        xml += `                    </value>\n`;
        xml += `                </property>\n`;

        return xml;
    }

    /**
     * Экранирует специальные символы для XML
     */
    escapeXML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}