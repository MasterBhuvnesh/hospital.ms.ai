# RabbitMQ with the delayed-message exchange plugin.
#
# The plugin is not in the official image and is not installable on a managed
# broker such as Amazon MQ, which is why RabbitMQ is self-hosted on every
# deployment profile. See docs/tech-stack.md and docs/portability.md.
# The broker is pinned, not floating. The plugin is released against a
# specific broker minor and refuses to load on anything newer, so `rabbitmq:4`
# breaks this build the day upstream ships a minor the plugin has not caught
# up to. Bump both lines together, never one.
FROM rabbitmq:4.2-management-alpine

ARG PLUGIN_VERSION=4.2.0
ADD --chown=rabbitmq:rabbitmq \
    https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v${PLUGIN_VERSION}/rabbitmq_delayed_message_exchange-${PLUGIN_VERSION}.ez \
    /opt/rabbitmq/plugins/

RUN rabbitmq-plugins enable --offline rabbitmq_delayed_message_exchange
