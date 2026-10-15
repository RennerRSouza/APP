import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {theme} from '../../core/theme';
import {DetectionOverlay} from '../components/DetectionOverlay';
import {PrimaryButton} from '../components/PrimaryButton';
import {useContagemFlow} from '../hooks/useContagemFlow';
import {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Resultado'>;

export function ResultScreen({route, navigation}: Props) {
  const {imageUri} = route.params;
  const {
    state,
    confirmado,
    ajustar,
    salvar,
    saving,
    justificativa,
    setJustificativa,
    divergenciaPercentual,
    exigeJustificativa,
  } = useContagemFlow(imageUri);

  const onSalvar = async () => {
    if (exigeJustificativa && !justificativa.trim()) {
      Alert.alert(
        'Justificativa Obrigatória',
        `A divergência foi de ${divergenciaPercentual.toFixed(1)}%, excedendo a tolerância de 10% da IA. Por favor, descreva o motivo da alteração antes de salvar.`,
      );
      return;
    }

    try {
      await salvar();
      navigation.replace('Historico');
    } catch (e) {
      Alert.alert('Não foi possível salvar', String(e));
    }
  };

  if (state.status === 'processing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.muted}>Analisando imagem com YOLO...</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{state.message}</Text>
        <PrimaryButton label="Voltar" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const {resultado} = state;
  const houveAlteracao = confirmado !== resultado.total;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <DetectionOverlay uri={imageUri} detections={resultado.detections} />

      <Text style={styles.muted}>
        Modelo detectou {resultado.total} • {resultado.duracaoMs} ms
      </Text>

      {Object.entries(resultado.porClasse).map(([k, v]) => (
        <Text key={k} style={styles.text}>
          {k}: {v}
        </Text>
      ))}

      <Text style={styles.label}>Ajuste manual da contagem:</Text>
      <View style={styles.row}>
        <PrimaryButton label="−" onPress={() => ajustar(-1)} variant="ghost" />
        <Text style={styles.big}>{confirmado}</Text>
        <PrimaryButton label="+" onPress={() => ajustar(1)} variant="ghost" />
      </View>

      {/* Bloco de Divergência e Justificativa */}
      {houveAlteracao && (
        <View
          style={[
            styles.cardAlerta,
            exigeJustificativa ? styles.bordaPerigo : styles.bordaAviso,
          ]}>
          <Text
            style={[
              styles.tituloAlerta,
              {color: exigeJustificativa ? theme.colors.danger : theme.colors.text},
            ]}>
            Divergência da IA: {divergenciaPercentual.toFixed(1)}%
            {exigeJustificativa ? ' (Excede tolerância de 10%)' : ''}
          </Text>

          {exigeJustificativa && (
            <Text style={styles.subtituloAlerta}>
              * O SIGA Web Admin exige uma justificativa para auditoria desta contagem.
            </Text>
          )}

          <TextInput
            style={[
              styles.input,
              exigeJustificativa && !justificativa.trim() && styles.inputInvalido,
            ]}
            placeholder="Ex: Peças sobrepostas na pilha, baixa iluminação..."
            placeholderTextColor={theme.colors.muted}
            multiline
            numberOfLines={3}
            value={justificativa}
            onChangeText={setJustificativa}
          />
        </View>
      )}

      <PrimaryButton
        label={saving ? 'Salvando...' : 'Salvar contagem'}
        onPress={onSalvar}
        disabled={saving}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {padding: theme.spacing.md, gap: theme.spacing.md},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  text: {color: theme.colors.text, fontSize: theme.font.body},
  label: {color: theme.colors.text, fontSize: theme.font.body, fontWeight: '600'},
  muted: {color: theme.colors.muted, fontSize: 14},
  error: {color: theme.colors.danger, textAlign: 'center'},
  big: {color: theme.colors.text, fontSize: theme.font.big, fontWeight: '700'},

  cardAlerta: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    gap: theme.spacing.sm,
  },
  bordaAviso: {borderColor: theme.colors.warning},
  bordaPerigo: {borderColor: theme.colors.danger},
  tituloAlerta: {fontSize: 15, fontWeight: '700'},
  subtituloAlerta: {fontSize: 13, color: theme.colors.danger},
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  inputInvalido: {
    borderColor: theme.colors.danger,
  },
});