import {BackendResponse} from '@common/http/backend-response/backend-response';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {apiClient} from '@common/http/query-client';
import {VotableModel} from '@common/votes/votable-model';
import {useMutation} from '@tanstack/react-query';

interface Response extends BackendResponse {
  model: VotableModel;
}

interface Payload {
  voteType: 'upvote' | 'downvote';
}

export function useStoreVote(model: VotableModel) {
  return useMutation({
    mutationFn: (payload: Payload) => changeVote(model, payload),
    onSuccess: response => {
      //
    },
    onError: err => showHttpErrorToast(err),
  });
}

function changeVote(model: VotableModel, payload: Payload) {
  return apiClient
    .post<Response>('vote', {
      vote_type: payload.voteType,
      model_id: model.id,
      model_type: model.model_type,
    })
    .then(r => r.data);
}
