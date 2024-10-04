import { Questionnaire, QuestionnaireItem, QuestionnaireResponse } from 'fhir/r4';

export interface Question {
  question: string;
  answer?: string | undefined;
  answers?: Question[];
}

const typeToValueKeyMap = new Map([
  ['string', 'valueString'],
  ['text', 'valueString'],
  ['choice', 'valueString'],
  ['boolean', 'valueBoolean'],
  ['integer', 'valueInteger'],
  ['date', 'valueDate'],
  ['decimal', 'valueDecimal'],
  ['time', 'valueTime'],
  ['dateTime', 'valueDateTime'],
  ['open-choice', 'valueString'],
  ['attachment', 'valueAttachment'],
  ['reference', 'valueReference'],
  ['quantity', 'valueQuantity'],
  ['coding', 'valueCoding'],
]);

type QuestionnaireItemWithGroup = QuestionnaireItem & { groupLinkId?: string; groupTitle?: string };

export const simplifyQuestionnaireResponse = (
  response: QuestionnaireResponse,
  questionnaire: Questionnaire,
): Question[] => {
  const questionnaireTitlesMap = new Map<string, QuestionnaireItemWithGroup>(
    questionnaire.item?.flatMap((question) =>
      question.type == 'group' && question?.item
        ? question!.item.map((item) => [
            item.linkId,
            { ...item, groupLinkId: question.linkId, groupTitle: question.text },
          ])
        : [[question.linkId, question]],
    ),
  );

  const summary: Question[] =
    response.item?.reduce((accumulator, item) => {
      let acc = accumulator;
      const formQuestion = questionnaireTitlesMap.get(item.linkId);

      // determine where to push the final question object
      // If it's a member of a question grouping, push it to the group answers list
      if (formQuestion?.groupLinkId && formQuestion?.groupTitle) {
        let groupQuestion = accumulator.find((it) => it.question === formQuestion.groupTitle);
        if (!groupQuestion) {
          // Add the group to the accumulator if it doesn't already exist
          groupQuestion = { question: formQuestion.groupTitle, answers: [] };
          accumulator.push(groupQuestion);
        }
        // final answer object will be pushed to the group answers list
        acc = groupQuestion!.answers as Question[];
      }

      const question = formQuestion?.text || item.linkId;
      let answer = '';
      if (item.answer) {
        answer += item.answer
          .map((it) => {
            if (formQuestion?.type) {
              const key = typeToValueKeyMap.get(formQuestion.type);
              if (key) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                return it[key];
              }
            }
            return '';
          })
          .join(',');
      }

      acc.push({
        question: question,
        answer: answer,
      });

      return accumulator;
    }, [] as Question[]) || [];

  return summary;
};
