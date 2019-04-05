FROM node:dubnium-alpine
ADD ./ /src
WORKDIR /src
EXPOSE 5011

USER nobody

ENTRYPOINT ["npm", "start"]