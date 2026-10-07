import {StyleSheet, Text, View} from 'react-native';
import type {ScoreCardItem} from './ScoreCard';
import type {ScoreLanguage} from '../domain/scoreCardDefinitions';

const reasonText: Record<string, {en: string; es: string}> = {
  sec_supported_inputs: {
    en: 'Includes ratios recovered from saved company filings.',
    es: 'Incluye ratios obtenidos de documentos guardados de la empresa.',
  },
  partial_evidence_score: {
    en: 'Partial score: calculated from the available inputs.',
    es: 'Puntuación parcial: calculada con los datos disponibles.',
  },
  insufficient_component_evidence: {
    en: 'Too little usable evidence for a numerical score.',
    es: 'Evidencia insuficiente para una puntuación numérica.',
  },
  incomplete_component_evidence: {
    en: 'Some required inputs cannot be assessed by this model.',
    es: 'El modelo no puede evaluar todas las entradas necesarias.',
  },
  insufficient_core_evidence: {
    en: 'An essential underlying assessment is unavailable.',
    es: 'Falta una evaluaciÃ³n fundamental necesaria.',
  },
  positive_operating_income_required: {
    en: 'Operating income is not positive.',
    es: 'El resultado operativo no es positivo.',
  },
  positive_incremental_operating_margin_required: {
    en: 'Additional revenue did not produce additional operating profit.',
    es: 'Los ingresos adicionales no generaron beneficio operativo adicional.',
  },
  operating_income_required: {
    en: 'Operating income is unavailable.',
    es: 'El resultado operativo no estÃ¡ disponible.',
  },
  incremental_operating_margin_required: {
    en: 'Incremental operating profitability cannot be assessed.',
    es: 'No se puede evaluar la rentabilidad operativa incremental.',
  },
  stale_or_missing_source_dates: {
    en: 'The underlying data is outdated or undated.',
    es: 'Los datos estÃ¡n desactualizados o no tienen fecha.',
  },
  core_factor_below_minimum: {
    en: 'An essential factor does not meet this modelâ€™s requirements.',
    es: 'Un factor esencial no cumple los requisitos del modelo.',
  },
  cash_flow_identity_mismatch: {
    en: 'Cash-flow figures need reconciliation.',
    es: 'Es necesario conciliar las cifras de flujo de caja.',
  },
};

export function ScoreEvidence({
  item,
  language = 'en',
}: {
  item: ScoreCardItem;
  language?: ScoreLanguage;
}) {
  const coverage =
    typeof item.coverage === 'number' && Number.isFinite(item.coverage)
      ? Math.round(Math.max(0, Math.min(1, item.coverage)) * 100)
      : null;
  const confidence = item.confidence
    ? language === 'es'
      ? {low: 'Baja', medium: 'Media', high: 'Alta'}[item.confidence]
      : {low: 'Low', medium: 'Medium', high: 'High'}[item.confidence]
    : null;
  if (coverage === null && !confidence && !item.reasons?.length) return null;
  return (
    <View style={styles.container}>
      {coverage !== null ? (
        <Text style={styles.text}>
          {language === 'es' ? 'Entradas utilizables' : 'Usable model inputs'}: {coverage}%
        </Text>
      ) : null}
      {confidence ? (
        <Text style={styles.text}>
          {language === 'es' ? 'Confianza de la evidencia' : 'Evidence confidence'}: {confidence}
        </Text>
      ) : null}
      {item.score === null ? (
        <Text style={styles.text}>
          {language === 'es' ? 'EvaluaciÃ³n no disponible.' : 'Assessment unavailable.'}
        </Text>
      ) : null}
      {item.reasons?.map((reason, index) => (
        <Text key={`${index}-${reason}`} style={styles.text}>
          {reasonText[reason]?.[language] ?? reason.replace(/_/g, ' ')}
        </Text>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {marginTop: 8, gap: 3},
  text: {fontSize: 11, lineHeight: 16, color: '#667792'},
});